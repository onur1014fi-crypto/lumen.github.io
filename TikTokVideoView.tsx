import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, ExternalLink, Link2, Loader2, RefreshCw, UserRound } from "lucide-react";
import type { TikTokVideo } from "../types";
import {
  addRecentTikTok,
  embedSrc,
  getRecentTikToks,
  getTikTokContext,
  profileUrl,
  recallTikTok,
  videoUrl,
} from "../lib/tiktok";
import { cn } from "../utils/cn";
import { Cover, metaLine } from "./TikTokCard";

interface Props {
  id: string;
  user?: string;
  onOpen: (video: { id: string; user?: string }) => void;
  onOpenCreator: (user: string) => void;
  onBackToList: () => void;
  toast: (msg: string) => void;
}

function Row({ video, onPlay }: { video: TikTokVideo; onPlay: () => void }) {
  return (
    <button
      onClick={onPlay}
      className="group flex w-full gap-3 rounded-xl p-1.5 text-left transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-ember"
      aria-label={`Play ${video.title || "TikTok video"}`}
    >
      <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-lg bg-panel ring-1 ring-white/10">
        <Cover src={video.cover} />
      </div>
      <div className="min-w-0 py-0.5">
        <h4 className="line-clamp-2 text-[13px] leading-snug font-medium text-zinc-100">
          {video.title || (video.user ? `Video by @${video.user}` : "TikTok video")}
        </h4>
        <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{metaLine(video)}</p>
      </div>
    </button>
  );
}

/** One TikTok, played by TikTok's own embedded player, with the list it came from alongside. */
export function TikTokVideoView({ id, user, onOpen, onOpenCreator, onBackToList, toast }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [reloads, setReloads] = useState(0);
  const { videos, label } = getTikTokContext();

  const index = videos.findIndex((v) => v.id === id);
  const meta = recallTikTok(id) ?? (index >= 0 ? videos[index] : undefined);
  const creator = user || meta?.user || "";
  const caption = meta?.title ?? "";

  useEffect(() => {
    setLoaded(false);
    setReloads(0);
  }, [id]);

  useEffect(() => {
    addRecentTikTok({ id, user: creator || undefined, title: caption || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const prev = index > 0 ? videos[index - 1] : undefined;
  const next = index >= 0 && index < videos.length - 1 ? videos[index + 1] : undefined;

  const upNext = useMemo<TikTokVideo[]>(() => {
    if (index >= 0) return videos.slice(index + 1, index + 13);
    return getRecentTikToks()
      .filter((r) => r.id !== id)
      .map((r) => ({ id: r.id, title: r.title ?? "", user: r.user ?? "" }));
  }, [videos, index, id]);

  const go = (v?: TikTokVideo) => v && onOpen({ id: v.id, user: v.user || undefined });

  const navBtn =
    "grid h-11 w-11 place-items-center rounded-full bg-white/8 text-zinc-200 transition hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-ember";
  const pill =
    "inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-ember";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copied");
    } catch {
      toast("Couldn't copy — copy it from the address bar");
    }
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-12">
      {/* Player */}
      <div className="mx-auto w-full max-w-[360px]">
        <div className="relative h-[740px] overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 shadow-black/60 ring-white/10">
          {!loaded && (
            <div className="absolute inset-0 grid place-items-center text-zinc-600">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          <iframe
            key={`${id}:${reloads}`}
            title="TikTok video player"
            src={embedSrc(id) + (reloads ? `?r=${reloads}` : "")}
            onLoad={() => setLoaded(true)}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
          Press play inside the video. If the player is blank or says “ratelimit triggered”, wait a moment and reload it
          (TikTok limits how fast its player can be opened). Private or removed videos won't play.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              setLoaded(false);
              setReloads((n) => n + 1);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-ember"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reload player
          </button>
          <a
            href={videoUrl(id, creator)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-ember"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open on TikTok
          </a>
        </div>
      </div>

      {/* Details */}
      <div className="min-w-0">
        <div className="animate-fade-up">
          <span className="text-xs font-medium text-zinc-500">
            {label ? `From ${label}` : "TikTok"}
          </span>
          <h1 className="mt-1 font-display text-xl leading-snug font-semibold tracking-tight text-white sm:text-2xl">
            {caption || (creator ? `Video by @${creator}` : "TikTok video")}
          </h1>
          {creator && (
            <button
              onClick={() => onOpenCreator(creator)}
              className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-zinc-300 transition hover:text-white"
            >
              <span className="bg-gradient-tt grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white">
                {creator.charAt(0).toUpperCase()}
              </span>
              @{creator}
            </button>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button className={navBtn} onClick={() => go(prev)} disabled={!prev} aria-label="Previous video" title="Previous">
              <ChevronUp className="h-5 w-5" />
            </button>
            <button className={navBtn} onClick={() => go(next)} disabled={!next} aria-label="Next video" title="Next">
              <ChevronDown className="h-5 w-5" />
            </button>
            {index >= 0 && (
              <span className="px-1 text-xs text-zinc-500 tabular-nums">
                {index + 1} / {videos.length}
              </span>
            )}
            <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
            <button className={pill} onClick={copy}>
              <Link2 className="h-4 w-4" /> Share
            </button>
            <a className={pill} href={videoUrl(id, creator)} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> Open on TikTok
            </a>
            {creator && (
              <a className={cn(pill, "hidden sm:inline-flex")} href={profileUrl(creator)} target="_blank" rel="noreferrer">
                <UserRound className="h-4 w-4" /> Profile
              </a>
            )}
          </div>

          {videos.length > 0 && (
            <button
              onClick={onBackToList}
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to {label || "results"}
            </button>
          )}
        </div>

        {upNext.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 px-1.5 font-display text-sm font-semibold text-white">
              {index >= 0 ? "Up next" : "Recently watched"}
            </h2>
            <div className="flex flex-col gap-0.5">
              {upNext.map((v) => (
                <Row key={v.id} video={v} onPlay={() => go(v)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
