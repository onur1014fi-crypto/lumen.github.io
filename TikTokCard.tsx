import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import type { TikTokVideo } from "../types";
import { formatCount, formatDuration } from "../lib/tiktok";
import { timeAgo } from "../lib/youtube";
import { cn } from "../utils/cn";

/** Cover image that falls back to a branded tile (TikTok's image links expire). */
export function Cover({ src, className }: { src?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div className={cn("bg-gradient-tt grid h-full w-full place-items-center", className)} aria-hidden>
        <Play className="h-6 w-6 text-white/80" fill="currentColor" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      draggable={false}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

export function metaLine(v: TikTokVideo) {
  const when = v.created ? timeAgo(new Date(v.created * 1000).toISOString()) : "";
  return [v.user ? `@${v.user}` : v.nickname, when].filter(Boolean).join(" · ");
}

/** Portrait card used in result grids. */
export function TikTokCard({ video, onPlay }: { video: TikTokVideo; onPlay: () => void }) {
  const plays = formatCount(video.plays);
  return (
    <article className="group">
      <button
        onClick={onPlay}
        className="block w-full rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember"
        aria-label={`Play ${video.title || "TikTok video"}`}
      >
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-panel ring-1 ring-white/10 transition duration-300 group-hover:ring-white/30">
          <Cover src={video.cover} className="transition duration-500 group-hover:scale-105" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/85 via-black/30 to-transparent p-2.5 pt-10">
            {plays && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-white">
                <Play className="h-3 w-3" fill="currentColor" /> {plays}
              </span>
            )}
          </div>
          <span className="bg-gradient-tt absolute top-1/2 left-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-white opacity-0 shadow-xl transition group-hover:opacity-100">
            <Play className="h-5 w-5 translate-x-px" fill="currentColor" />
          </span>
          {video.duration ? (
            <span className="absolute top-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
              {formatDuration(video.duration)}
            </span>
          ) : null}
        </div>
        <h3 className="mt-2.5 line-clamp-2 text-sm leading-snug font-medium text-zinc-100 group-hover:text-white">
          {video.title || "Untitled TikTok"}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{metaLine(video)}</p>
      </button>
    </article>
  );
}
