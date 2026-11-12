import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ALL_CURATED } from "./data/curated";
import { Header } from "./components/Header";
import { HomePage } from "./components/HomePage";
import { LibraryPage } from "./components/LibraryPage";
import { SearchPage } from "./components/SearchPage";
import { SettingsModal } from "./components/SettingsModal";
import { Toast } from "./components/Toast";
import { WatchPage } from "./components/WatchPage";
import { FollowingPage } from "./components/FollowingPage";
import { TikTokPage } from "./components/TikTokPage";
import { LogoMark } from "./components/Logo";
import { parseChannelInput, refToString } from "./lib/channelRef";
import { channelRefForVideo, resolveChannel, sameName } from "./lib/channels";
import { addRecent, clearRecents } from "./lib/recent";
import { clearRecentTikToks } from "./lib/tiktok";
import { parseTikTokInput } from "./lib/tiktokRef";
import { useRoute } from "./lib/router";
import { useLocalStorage } from "./lib/storage";
import { recall, remember, rotateAfter } from "./lib/store";
import { fetchOEmbed, looksLikeYouTubeLink, parseVideoId } from "./lib/youtube";
import { DEFAULT_SETTINGS, type Actions, type Channel, type Settings, type VideoMeta } from "./types";

const HISTORY_LIMIT = 60;

export default function App() {
  const [route, navigate] = useRoute();

  const [saved, setSaved] = useLocalStorage<VideoMeta[]>("lumen:saved", []);
  const [history, setHistory] = useLocalStorage<VideoMeta[]>("lumen:history", []);
  const [queue, setQueue] = useLocalStorage<VideoMeta[]>("lumen:queue", []);
  const [storedSettings, setSettings] = useLocalStorage<Settings>("lumen:settings", DEFAULT_SETTINGS);
  const settings: Settings = { ...DEFAULT_SETTINGS, ...storedSettings };

  const [context, setContext] = useState<VideoMeta[]>([]);
  const [contextLabel, setContextLabel] = useState<string | undefined>(undefined);
  // Followed channels are deliberately kept in memory only and never written to storage,
  // so this section starts out empty every time Lumen is opened.
  const [followed, setFollowed] = useState<Channel[]>([]);
  const [fetched, setFetched] = useState<Record<string, VideoMeta>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theater, setTheater] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2200);
  }, []);

  /* ---------------- The video being watched ---------------- */

  const watchId = route.name === "watch" ? route.id : null;
  const known = watchId
    ? (recall(watchId) ??
      saved.find((v) => v.id === watchId) ??
      history.find((v) => v.id === watchId) ??
      queue.find((v) => v.id === watchId) ??
      fetched[watchId])
    : undefined;
  const current = known;

  // Pasted links we've never seen: look up the title via oEmbed.
  useEffect(() => {
    if (!watchId || known) return;
    let cancelled = false;
    fetchOEmbed(watchId).then((meta) => {
      if (cancelled) return;
      const value = meta ?? { id: watchId, title: "YouTube video", channel: "" };
      remember(value);
      setFetched((f) => ({ ...f, [watchId]: value }));
    });
    return () => {
      cancelled = true;
    };
  }, [watchId, !!known]);

  // Record to history once we know what it is.
  useEffect(() => {
    if (!current) return;
    setHistory((h) =>
      h[0]?.id === current.id && h[0].title === current.title
        ? h
        : [current, ...h.filter((x) => x.id !== current.id)].slice(0, HISTORY_LIMIT),
    );
  }, [current?.id, current?.title]);

  useEffect(() => {
    document.title = current
      ? `${current.title} · Lumen`
      : route.name === "search"
        ? `${route.q} · Lumen`
        : route.name === "tiktok"
          ? "TikTok · Lumen"
          : route.name === "following" || route.name === "channel"
            ? "Following · Lumen"
          : "Lumen — Watch YouTube Without Leaving";
  }, [current, route]);

  /* ---------------- Actions ---------------- */

  const play = useCallback(
    (video: VideoMeta, ctx?: VideoMeta[], label?: string) => {
      remember(video);
      if (ctx) {
        setContext(ctx);
        setContextLabel(label);
      }
      navigate({ name: "watch", id: video.id });
    },
    [navigate],
  );

  const toggleSave = useCallback(
    (video: VideoMeta) => {
      const isSaved = saved.some((v) => v.id === video.id);
      setSaved((list) => (isSaved ? list.filter((v) => v.id !== video.id) : [video, ...list]));
      toast(isSaved ? "Removed from saved" : "Saved for later");
    },
    [saved, setSaved, toast],
  );

  const enqueue = useCallback(
    (video: VideoMeta) => {
      if (queue.some((v) => v.id === video.id)) {
        toast("Already in your queue");
        return;
      }
      remember(video);
      setQueue((q) => [...q, video]);
      toast("Added to queue");
    },
    [queue, setQueue, toast],
  );

  const savedIds = useMemo(() => new Set(saved.map((v) => v.id)), [saved]);
  const actions: Actions = useMemo(
    () => ({ play, toggleSave, enqueue, savedIds }),
    [play, toggleSave, enqueue, savedIds],
  );

  /* ---------------- Channels ---------------- */

  const followChannel = useCallback(
    (c: Channel) => {
      setFollowed((list) =>
        list.some((x) => x.id === c.id)
          ? list
          : [
              ...list,
              {
                id: c.id,
                name: c.name,
                avatar: c.avatar,
                subscribers: c.subscribers,
                verified: c.verified,
                description: c.description,
              },
            ],
      );
      toast(`Following ${c.name}`);
    },
    [toast],
  );

  const unfollowChannel = useCallback(
    (id: string) => {
      setFollowed((list) => list.filter((c) => c.id !== id));
      toast("Unfollowed");
    },
    [toast],
  );

  const followedMatch = useCallback(
    (video: VideoMeta) =>
      followed.find((c) => (video.channelId ? c.id === video.channelId : sameName(c.name, video.channel))),
    [followed],
  );

  const toggleFollowVideo = useCallback(
    async (video: VideoMeta) => {
      const existing = followedMatch(video);
      if (existing) {
        unfollowChannel(existing.id);
        return;
      }
      try {
        const target = await channelRefForVideo(video);
        if (!target) throw new Error("unknown channel");
        const details = await resolveChannel(target.ref, target.hint);
        remember({ ...video, channelId: details.id });
        followChannel(details);
      } catch {
        toast("Couldn't find this video's channel. Try again in a moment.");
      }
    },
    [followedMatch, unfollowChannel, followChannel, toast],
  );

  const openVideoChannel = useCallback(
    async (video: VideoMeta) => {
      try {
        const target = await channelRefForVideo(video);
        if (!target) throw new Error("unknown channel");
        const details = await resolveChannel(target.ref, target.hint);
        remember({ ...video, channelId: details.id });
        navigate({ name: "channel", ref: details.id });
      } catch {
        toast("Couldn't open this video's channel. Try again in a moment.");
      }
    },
    [navigate, toast],
  );

  // What "next" means: the queue first, then the list you came from.
  const pool = context.length ? context : ALL_CURATED;

  const latest = useRef({ queue, pool, currentId: watchId });
  latest.current = { queue, pool, currentId: watchId };

  const playNext = useCallback(() => {
    const { queue: q, pool: p, currentId } = latest.current;
    if (q.length) {
      const [next, ...rest] = q;
      setQueue(rest);
      play(next);
      return;
    }
    const next = rotateAfter(p, currentId ?? "").find((v) => v.id !== currentId) ?? ALL_CURATED[0];
    play(next);
  }, [play, setQueue]);

  const onEnded = useCallback(() => {
    if (settings.autoplay) playNext();
  }, [settings.autoplay, playNext]);

  const submit = useCallback(
    (text: string) => {
      // TikTok links (and bare TikTok video ids) belong to the TikTok section.
      const tt = parseTikTokInput(text);
      if (tt) {
        if (tt.kind === "video") navigate({ name: "tiktok", view: { kind: "video", id: tt.id, user: tt.user } });
        else if (tt.kind === "creator") navigate({ name: "tiktok", view: { kind: "creator", user: tt.user } });
        else toast("Short TikTok links can't be opened here. Paste the full link instead (tiktok.com/@name/video/…)");
        return;
      }
      const id = parseVideoId(text);
      if (id) {
        setContext([]);
        setContextLabel(undefined);
        navigate({ name: "watch", id });
      } else if (parseChannelInput(text)) {
        navigate({ name: "channel", ref: refToString(parseChannelInput(text)!) });
      } else if (looksLikeYouTubeLink(text)) {
        toast("That link doesn't point to a video or channel");
      } else {
        addRecent(text);
        navigate({ name: "search", q: text });
      }
    },
    [navigate, toast],
  );

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copied");
    } catch {
      toast("Couldn't copy — copy it from the address bar");
    }
  }, [toast]);

  const clearData = useCallback(
    (what: "history" | "saved" | "queue" | "searches" | "tiktok") => {
      if (what === "history") setHistory([]);
      if (what === "saved") setSaved([]);
      if (what === "queue") setQueue([]);
      if (what === "searches") clearRecents();
      if (what === "tiktok") clearRecentTikToks();
      toast(`Cleared ${what === "tiktok" ? "TikTok history" : what}`);
    },
    [setHistory, setSaved, setQueue, toast],
  );

  const localPool = useMemo(() => [...saved, ...history, ...queue, ...ALL_CURATED], [saved, history, queue]);

  /* ---------------- Render ---------------- */

  return (
    <div className="relative isolate flex min-h-screen flex-col">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[950px] -translate-x-1/2 rounded-full bg-ember/10 blur-[130px]" />
        <div className="absolute top-1/3 -right-48 h-[460px] w-[460px] rounded-full bg-violet-600/10 blur-[130px]" />
      </div>

      <Header
        route={route}
        savedCount={saved.length}
        followedCount={followed.length}
        onSubmit={submit}
        onNavigate={navigate}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex-1">
        {route.name === "home" && (
          <HomePage history={history} actions={actions} onSubmit={submit} onNavigate={navigate} />
        )}

        {route.name === "watch" && (
          <WatchPage
            videoId={route.id}
            video={current}
            queue={queue}
            pool={pool}
            actions={actions}
            autoplay={settings.autoplay}
            onAutoplayChange={(autoplay) => setSettings({ ...settings, autoplay })}
            theater={theater}
            onTheaterChange={setTheater}
            onEnded={onEnded}
            onNext={playNext}
            onPlayQueued={(v) => {
              setQueue((q) => q.filter((x) => x.id !== v.id));
              play(v);
            }}
            onRemoveQueued={(id) => setQueue((q) => q.filter((x) => x.id !== id))}
            onClearQueue={() => clearData("queue")}
            onCopyLink={copyLink}
            contextLabel={contextLabel}
            following={current ? !!followedMatch(current) : false}
            onToggleFollow={() => (current ? toggleFollowVideo(current) : Promise.resolve())}
            onOpenChannel={() => (current ? openVideoChannel(current) : Promise.resolve())}
          />
        )}

        {route.name === "search" && (
          <SearchPage
            key={route.q}
            q={route.q}
            apiKey={settings.apiKey}
            localPool={localPool}
            actions={actions}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}
        {route.name === "tiktok" && (
          <TikTokPage
            view={route.view}
            apiKey={settings.tiktokKey}
            onNavigate={navigate}
            onOpenSettings={() => setSettingsOpen(true)}
            toast={toast}
          />
        )}

        {(route.name === "following" || route.name === "channel") && (
          <FollowingPage
            refParam={route.name === "channel" ? route.ref : undefined}
            followed={followed}
            actions={actions}
            onFollow={followChannel}
            onUnfollow={unfollowChannel}
            onNavigate={navigate}
          />
        )}

        {(route.name === "saved" || route.name === "history") && (
          <LibraryPage
            tab={route.name}
            saved={saved}
            history={history}
            actions={actions}
            onNavigate={navigate}
            onClear={(tab) => clearData(tab)}
          />
        )}
      </main>

      <footer className="border-t border-white/6 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-col items-center justify-between gap-3 text-center text-xs text-zinc-500 sm:flex-row sm:text-left">
          <span className="flex items-center gap-2.5">
            <LogoMark className="h-6 w-6 rounded-lg" />
            <span>Lumen · a calmer way to watch.</span>
          </span>
          <span>Videos are played by YouTube's and TikTok's official embedded players. Not affiliated with YouTube, TikTok or Google.</span>
        </div>
      </footer>

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
          onClearData={clearData}
          toast={toast}
        />
      )}

      <Toast message={toastMsg} />
    </div>
  );
}
