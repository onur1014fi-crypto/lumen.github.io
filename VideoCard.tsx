import { Bookmark, BookmarkCheck, ListPlus, Play } from "lucide-react";
import type { Actions, VideoMeta } from "../types";
import { formatViews, timeAgo } from "../lib/youtube";
import { cn } from "../utils/cn";
import { Thumb } from "./Thumb";

interface Props {
  video: VideoMeta;
  actions: Actions;
  onPlay: () => void;
  active?: boolean;
  hideChannel?: boolean;
}

function metaLine(v: VideoMeta, hideChannel?: boolean) {
  return [hideChannel ? "" : v.channel, formatViews(v.views), timeAgo(v.published) || v.publishedText]
    .filter(Boolean)
    .join(" · ");
}

function Badge({ video }: { video: VideoMeta }) {
  if (video.live) {
    return (
      <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
      </span>
    );
  }
  if (video.short && !video.duration) {
    return (
      <span className="absolute right-2 bottom-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white">
        SHORT
      </span>
    );
  }
  if (!video.duration) return null;
  return (
    <span className="absolute right-2 bottom-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
      {video.duration}
    </span>
  );
}

function QuickActions({ video, actions, className }: { video: VideoMeta; actions: Actions; className?: string }) {
  const saved = actions.savedIds.has(video.id);
  const btn =
    "grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white backdrop-blur transition hover:bg-black hover:text-gold focus-visible:outline-2 focus-visible:outline-ember";
  return (
    <div className={cn("flex gap-1.5", className)}>
      <button
        onClick={() => actions.toggleSave(video)}
        className={cn(btn, saved && "text-gold")}
        title={saved ? "Remove from saved" : "Save for later"}
        aria-label={saved ? "Remove from saved" : "Save for later"}
        aria-pressed={saved}
      >
        {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      </button>
      <button
        onClick={() => actions.enqueue(video)}
        className={btn}
        title="Add to queue"
        aria-label="Add to queue"
      >
        <ListPlus className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Large card used in grids. */
export function VideoCard({ video, actions, onPlay, active, hideChannel }: Props) {
  return (
    <article className="group relative">
      <button
        onClick={onPlay}
        className="block w-full rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember"
        aria-label={`Play ${video.title}`}
      >
        <div
          className={cn(
            "relative aspect-video overflow-hidden rounded-xl bg-panel ring-1 ring-white/10 transition duration-300 group-hover:ring-white/30",
            active && "ring-2 ring-ember",
          )}
        >
          <Thumb id={video.id} className="transition duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100">
            <span className="bg-gradient-ember grid h-12 w-12 place-items-center rounded-full text-ink shadow-xl">
              <Play className="h-5 w-5 translate-x-px" fill="currentColor" />
            </span>
          </div>
          <Badge video={video} />
        </div>
        <h3 className="mt-3 line-clamp-2 text-sm leading-snug font-medium text-zinc-100 group-hover:text-white">
          {video.title}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{metaLine(video, hideChannel)}</p>
      </button>
      <QuickActions
        video={video}
        actions={actions}
        className="absolute top-2 right-2 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      />
    </article>
  );
}

/** Compact horizontal row used in the watch-page sidebar. */
export function VideoRow({
  video,
  actions,
  onPlay,
  trailing,
}: Omit<Props, "active"> & { trailing?: React.ReactNode }) {
  return (
    <div className="group relative flex gap-3 rounded-xl p-1.5 transition hover:bg-white/5">
      <button
        onClick={onPlay}
        className="flex min-w-0 flex-1 gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-ember"
        aria-label={`Play ${video.title}`}
      >
        <div className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-lg bg-panel ring-1 ring-white/10 sm:w-40">
          <Thumb id={video.id} />
          <Badge video={video} />
        </div>
        <div className="min-w-0 py-0.5">
          <h4 className="line-clamp-2 text-[13px] leading-snug font-medium text-zinc-100">{video.title}</h4>
          <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{metaLine(video)}</p>
        </div>
      </button>
      {trailing ?? (
        <div className="absolute top-2 left-2 flex flex-col gap-1 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <QuickActions video={video} actions={actions} className="flex-col" />
        </div>
      )}
    </div>
  );
}
