import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, SkipForward, TriangleAlert } from "lucide-react";
import { loadYouTubeApi, watchUrl, type YTPlayerEvent } from "../lib/youtube";

interface Props {
  videoId: string;
  onEnded: () => void;
  onNext: () => void;
}

const ERROR_TEXT: Record<number, string> = {
  2: "That video link doesn't look valid.",
  5: "The player ran into a problem playing this video.",
  100: "This video is unavailable or has been made private.",
  101: "The owner of this video doesn't allow it to be played outside of YouTube.",
  150: "The owner of this video doesn't allow it to be played outside of YouTube.",
};

/**
 * Renders YouTube's official embedded player (privacy-friendly domain).
 * A plain <iframe> guarantees playback; the IFrame API is layered on top
 * to detect when a video ends or can't be embedded.
 */
export function Player({ videoId, onEnded, onNext }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<number | null>(null);

  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi()
      .then((YT) => {
        const el = iframeRef.current;
        if (cancelled || !el) return;
        new YT.Player(el, {
          events: {
            onStateChange: (e: YTPlayerEvent) => {
              if (e.data === 0) endedRef.current(); // ended
            },
            onError: (e: YTPlayerEvent) => setError(e.data),
          },
        });
      })
      .catch(() => {
        /* the plain iframe still plays; we just can't auto-advance */
      });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const params = new URLSearchParams({
    autoplay: "1",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    enablejsapi: "1",
  });
  if (/^https?:$/.test(window.location.protocol)) params.set("origin", window.location.origin);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 shadow-black/60 ring-white/10">
      <div className="absolute inset-0 grid place-items-center text-zinc-600">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
      <iframe
        ref={iframeRef}
        key={videoId}
        title="Video player"
        src={`https://www.youtube-nocookie.com/embed/${videoId}?${params}`}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />

      {error !== null && (
        <div className="animate-pop-in absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-ink/95 p-6 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-red-500/15 text-red-400">
            <TriangleAlert className="h-6 w-6" />
          </span>
          <div className="max-w-md">
            <p className="font-display text-lg font-semibold text-white">Can't play this one here</p>
            <p className="mt-1 text-sm text-zinc-400">{ERROR_TEXT[error] ?? ERROR_TEXT[5]}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={onNext}
              className="bg-gradient-ember inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-ink hover:brightness-110"
            >
              <SkipForward className="h-4 w-4" /> Play something else
            </button>
            <a
              href={watchUrl(videoId)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/15"
            >
              <ExternalLink className="h-4 w-4" /> Open on YouTube
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
