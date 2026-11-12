import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, AtSign, Clock, ExternalLink, Info, KeyRound, Link2, Music2, Search, Sparkles, X } from "lucide-react";
import type { Route, TikTokVideo, TikTokView } from "../types";
import {
  getRecentTikToks,
  getTikTokContext,
  rememberTikTok,
  searchTikTok,
  setTikTokContext,
  type TikTokRecent,
} from "../lib/tiktok";
import { looksLikeTikTok, parseTikTokInput } from "../lib/tiktokRef";
import { cn } from "../utils/cn";
import { TikTokCreatorView } from "./TikTokCreatorView";
import { TikTokFeed } from "./TikTokFeed";
import { TikTokVideoView } from "./TikTokVideoView";

interface Props {
  view: TikTokView;
  apiKey: string;
  onNavigate: (route: Route, opts?: { replace?: boolean }) => void;
  onOpenSettings: () => void;
  toast: (msg: string) => void;
}

const CREATORS: { user: string; tag: string }[] = [
  { user: "tiktok", tag: "TikTok official" },
  { user: "nasa", tag: "Space" },
  { user: "natgeo", tag: "Nature & science" },
  { user: "gordonramsayofficial", tag: "Cooking" },
  { user: "khaby.lame", tag: "Comedy" },
  { user: "mrbeast", tag: "Challenges" },
  { user: "zachking", tag: "Magic & illusions" },
  { user: "nba", tag: "Basketball" },
  { user: "espn", tag: "Sports" },
  { user: "redbull", tag: "Action sports" },
  { user: "charlidamelio", tag: "Dance" },
  { user: "scout2015", tag: "Pomeranians" },
];

const SHORT_LINK_NOTICE =
  "Short TikTok links (vm.tiktok.com/…) can only be opened by TikTok itself. Open the link once, then copy the full address from your browser (it looks like tiktok.com/@name/video/123…) and paste that here.";

export function TikTokPage({ view, apiKey, onNavigate, onOpenSettings, toast }: Props) {
  const [notice, setNotice] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const nav = useCallback(
    (v: TikTokView, replace?: boolean) =>
      onNavigate({ name: "tiktok", view: v }, replace ? { replace: true } : undefined),
    [onNavigate],
  );

  // Mirror what's being viewed in the box, and clear any old notice when the view changes.
  useEffect(() => {
    setNotice(null);
    setValue(view.kind === "search" ? view.q : view.kind === "creator" ? `@${view.user}` : "");
  }, [view]);

  useEffect(() => {
    document.title = "TikTok · Lumen";
  }, []);

  const go = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      const ref = parseTikTokInput(t, { bareHandle: true });
      setNotice(null);
      if (ref?.kind === "video") nav({ kind: "video", id: ref.id, user: ref.user });
      else if (ref?.kind === "creator") nav({ kind: "creator", user: ref.user });
      else if (ref?.kind === "short") setNotice(SHORT_LINK_NOTICE);
      else if (looksLikeTikTok(t)) {
        setNotice("That TikTok link doesn't point to a video or a creator. Try the link of a video, or @username.");
      } else nav({ kind: "search", q: t });
    },
    [nav],
  );

  const play = useCallback(
    (video: TikTokVideo, list: TikTokVideo[], label: string) => {
      rememberTikTok(video);
      setTikTokContext(list, label, view.kind === "search" || view.kind === "creator" ? view : undefined);
      nav({ kind: "video", id: video.id, user: video.user || undefined });
    },
    [nav, view],
  );

  const backToList = useCallback(() => {
    const from = getTikTokContext().from;
    if (from) nav(from);
    else window.history.back();
  }, [nav]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    go(value);
    inputRef.current?.blur();
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto mb-8 flex max-w-3xl flex-col gap-3 sm:mb-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav({ kind: "home" })}
            className="group flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember"
            aria-label="TikTok home"
          >
            <span className="bg-gradient-tt grid h-10 w-10 place-items-center rounded-xl text-white shadow-lg shadow-black/40 transition group-hover:scale-105">
              <Music2 className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight text-white">TikTok</span>
          </button>
        </div>

        <form
          onSubmit={submit}
          role="search"
          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-panel/90 p-1.5 pl-4 shadow-lg shadow-black/30 transition focus-within:border-white/30 focus-within:ring-4 focus-within:ring-[#fe2c55]/15"
        >
          <Search className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            type="text"
            enterKeyHint="search"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Search TikTok, paste a video link, or type @username…"
            aria-label="Search TikTok, paste a TikTok link, or enter a username"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none sm:text-base"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                setValue("");
                inputRef.current?.focus();
              }}
              className="rounded-full p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className="bg-gradient-tt shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-95"
          >
            {parseTikTokInput(value, { bareHandle: true })?.kind === "video"
              ? "Play"
              : parseTikTokInput(value, { bareHandle: true })?.kind === "creator"
                ? "Open"
                : "Search"}
          </button>
        </form>

        {notice && (
          <div
            role="status"
            className="animate-pop-in flex items-start gap-3 rounded-2xl border border-gold/25 bg-gold/6 p-4 text-sm leading-relaxed text-zinc-300"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <p className="flex-1">{notice}</p>
            <button onClick={() => setNotice(null)} className="text-zinc-500 hover:text-white" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {view.kind === "home" && (
        <Home hasKey={!!apiKey} onCreator={(user) => nav({ kind: "creator", user })} onOpen={(r) => nav({ kind: "video", id: r.id, user: r.user })} onOpenSettings={onOpenSettings} />
      )}

      {view.kind === "search" &&
        (apiKey ? (
          <section>
            <h2 className="mb-6 font-display text-xl font-semibold text-white">
              TikTok results for “<span className="text-gradient-tt">{view.q}</span>”
            </h2>
            <TikTokFeed
              key={`s:${view.q}`}
              cacheKey={`s:${view.q.toLowerCase()}:${apiKey.slice(-6)}`}
              load={(cursor) => searchTikTok(view.q, apiKey, cursor)}
              label={`“${view.q}”`}
              onPlay={play}
              onOpenSettings={onOpenSettings}
              emptyTitle="No TikToks found"
              emptyBody={`Nothing came back for “${view.q}”. Check the spelling or try more general keywords.`}
            />
          </section>
        ) : (
          <KeyNeeded q={view.q} onOpenSettings={onOpenSettings} onCreator={(user) => nav({ kind: "creator", user })} />
        ))}

      {view.kind === "creator" && (
        <TikTokCreatorView key={view.user} user={view.user} apiKey={apiKey} onPlay={play} onOpenSettings={onOpenSettings} />
      )}

      {view.kind === "video" && (
        <TikTokVideoView
          id={view.id}
          user={view.user}
          onOpen={(v) => nav({ kind: "video", id: v.id, user: v.user }, true)}
          onOpenCreator={(user) => nav({ kind: "creator", user })}
          onBackToList={backToList}
          toast={toast}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Home({
  hasKey,
  onCreator,
  onOpen,
  onOpenSettings,
}: {
  hasKey: boolean;
  onCreator: (user: string) => void;
  onOpen: (r: TikTokRecent) => void;
  onOpenSettings: () => void;
}) {
  const [recents] = useState(getRecentTikToks);

  const ways = [
    {
      icon: Link2,
      title: "Paste a video link",
      body: "Any tiktok.com video link, or just the numeric video ID, plays right here.",
      status: "Ready",
      ok: true,
    },
    {
      icon: AtSign,
      title: "Open a creator",
      body: "Type @username (or paste a profile link) to see their latest videos.",
      status: "Ready",
      ok: true,
    },
    {
      icon: Search,
      title: "Search by keyword",
      body: hasKey
        ? "Find videos by topic, sound or hashtag and play them in Lumen."
        : "Find videos by topic, sound or hashtag. Needs an API key from Settings.",
      status: hasKey ? "Key added" : "Needs key",
      ok: hasKey,
    },
  ];

  return (
    <div className="space-y-12">
      <section className="animate-fade-up mx-auto max-w-5xl">
        <div className="grid gap-3 sm:grid-cols-3">
          {ways.map(({ icon: Icon, title, body, status, ok }) => (
            <div key={title} className="rounded-2xl border border-white/8 bg-panel/60 p-5">
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/8 text-zinc-200">
                  <Icon className="h-4 w-4" />
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    ok ? "bg-emerald-500/12 text-emerald-300" : "bg-gold/12 text-gold",
                  )}
                >
                  {status}
                </span>
              </div>
              <h3 className="mt-4 font-display text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{body}</p>
              {!ok && (
                <button onClick={onOpenSettings} className="mt-3 text-sm font-medium text-white underline underline-offset-4">
                  Add key
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {recents.length > 0 && (
        <section className="mx-auto max-w-5xl">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white">
            <Clock className="h-4 w-4 text-zinc-500" /> Recently watched
          </h2>
          <div className="flex gap-2.5 overflow-x-auto pb-2">
            {recents.map((r) => (
              <button
                key={r.id}
                onClick={() => onOpen(r)}
                className="group w-36 shrink-0 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember"
                aria-label={`Watch ${r.title || r.user || "TikTok video"} again`}
              >
                <div className="bg-gradient-tt grid aspect-[3/4] place-items-center rounded-xl text-white ring-1 ring-white/10 transition group-hover:scale-[1.03]">
                  <Music2 className="h-7 w-7 opacity-90" />
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-snug text-zinc-300">
                  {r.title || (r.user ? `Video by @${r.user}` : "TikTok video")}
                </p>
                {r.user && <p className="mt-0.5 truncate text-xs text-zinc-500">@{r.user}</p>}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-5xl">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white">
          <Sparkles className="h-4 w-4 text-zinc-500" /> Popular creators
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CREATORS.map((c) => (
            <button
              key={c.user}
              onClick={() => onCreator(c.user)}
              className="group flex items-center gap-3 rounded-2xl border border-white/8 bg-panel/60 p-3 text-left transition hover:border-white/20 hover:bg-panel focus-visible:outline-2 focus-visible:outline-ember"
            >
              <span className="bg-gradient-tt grid h-11 w-11 shrink-0 place-items-center rounded-full font-display text-base font-bold text-white transition group-hover:scale-105">
                {c.user.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-white">@{c.user}</span>
                <span className="block truncate text-xs text-zinc-500">{c.tag}</span>
              </span>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-zinc-300" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function KeyNeeded({
  q,
  onOpenSettings,
  onCreator,
}: {
  q: string;
  onOpenSettings: () => void;
  onCreator: (user: string) => void;
}) {
  return (
    <section className="animate-fade-up mx-auto max-w-3xl">
      <div className="rounded-3xl border border-white/10 bg-panel/70 p-6 sm:p-8">
        <span className="bg-gradient-tt grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg shadow-black/40">
          <KeyRound className="h-5 w-5" />
        </span>
        <h2 className="mt-5 font-display text-xl font-semibold text-white">
          Searching TikTok for “{q}” needs an API key
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          TikTok doesn't offer a public search that a website can use on its own, so keyword search runs through the
          TikWM API. Add your key once in Settings and results for “{q}” show up here, playable inside Lumen. The key
          stays in this browser and is only sent to that service.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={onOpenSettings}
            className="bg-gradient-tt rounded-xl px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
          >
            Add API key
          </button>
          <a
            href="https://tikwmapi.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/15"
          >
            Get a key <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-white/8 bg-white/3 p-5">
        <p className="font-display text-sm font-semibold text-white">These work right now, with no key</p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-400">
          <li className="flex gap-3">
            <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
            Paste a TikTok video link into the box above to watch it here.
          </li>
          <li className="flex gap-3">
            <AtSign className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
            <span>
              Type <code className="rounded bg-white/8 px-1.5 py-0.5 text-zinc-200">@username</code> to browse a creator.
              {q.trim() && /^[\w.]{2,40}$/.test(q.trim()) && (
                <>
                  {" "}
                  Is “{q.trim()}” a creator?{" "}
                  <button
                    onClick={() => onCreator(q.trim())}
                    className="font-medium text-white underline underline-offset-4"
                  >
                    Open @{q.trim()}
                  </button>
                </>
              )}
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}
