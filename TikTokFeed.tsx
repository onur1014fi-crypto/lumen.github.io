import { useCallback, useEffect, useRef, useState } from "react";
import { CircleAlert, KeyRound, Loader2, RefreshCw } from "lucide-react";
import type { TikTokVideo } from "../types";
import { rememberTikTok, type TikTokPageData } from "../lib/tiktok";
import { EmptyState } from "./SearchPage";
import { TikTokCard } from "./TikTokCard";

interface Props {
  /** Identifies this list (and the key it was fetched with) so results can be reused. */
  cacheKey: string;
  load: (cursor?: string) => Promise<TikTokPageData>;
  /** Names the list, e.g. “cats” or “@nasa”, for Previous/Next and “Up next”. */
  label: string;
  onPlay: (video: TikTokVideo, list: TikTokVideo[], label: string) => void;
  onOpenSettings: () => void;
  emptyTitle: string;
  emptyBody: string;
}

const cache = new Map<string, TikTokPageData>();

const GRID = "grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";

/** A paginated, infinitely scrolling grid of TikTok videos from the keyed API. */
export function TikTokFeed({ cacheKey, load, label, onPlay, onOpenSettings, emptyTitle, emptyBody }: Props) {
  const loadRef = useRef(load);
  loadRef.current = load;

  const [data, setData] = useState<TikTokPageData | null>(() => cache.get(cacheKey) ?? null);
  const [loading, setLoading] = useState(() => !cache.has(cacheKey));
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cached = cache.get(cacheKey);
    if (cached) {
      rememberTikTok(cached.videos);
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    loadRef
      .current()
      .then((page) => {
        if (cancelled) return;
        rememberTikTok(page.videos);
        if (page.videos.length) cache.set(cacheKey, page);
        setData(page);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [cacheKey, attempt]);

  const loadMore = useCallback(async () => {
    if (!data?.hasMore || busy.current) return;
    busy.current = true;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const page = await loadRef.current(data.cursor);
      rememberTikTok(page.videos);
      const seen = new Set(data.videos.map((v) => v.id));
      const merged: TikTokPageData = {
        videos: [...data.videos, ...page.videos.filter((v) => !seen.has(v.id))],
        cursor: page.cursor,
        hasMore: page.hasMore,
      };
      cache.set(cacheKey, merged);
      setData(merged);
    } catch {
      setMoreFailed(true);
    } finally {
      busy.current = false;
      setLoadingMore(false);
    }
  }, [data, cacheKey]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !data?.hasMore || moreFailed || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void loadMore(), {
      rootMargin: "700px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [data, moreFailed, loadMore]);

  const videos = data?.videos ?? [];

  return (
    <div>
      {loading && (
        <div className={GRID} aria-hidden>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton aspect-[3/4] rounded-xl" />
              <div className="skeleton mt-3 h-3.5 w-11/12 rounded" />
              <div className="skeleton mt-2 h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="animate-pop-in flex flex-col gap-4 rounded-2xl border border-red-500/30 bg-red-500/8 p-5 sm:flex-row sm:items-center"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-300">
            <CircleAlert className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="font-display font-semibold text-white">TikTok didn't come through</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">{error}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              onClick={() => {
                cache.delete(cacheKey);
                setAttempt((n) => n + 1);
              }}
              className="bg-gradient-tt inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110"
            >
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
            <button
              onClick={onOpenSettings}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/15"
            >
              <KeyRound className="h-4 w-4" /> Check key
            </button>
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <>
          <p className="mb-5 text-sm text-zinc-500">
            {videos.length}
            {data?.hasMore ? "+" : ""} videos
          </p>
          <div className={GRID}>
            {videos.map((v, i) => (
              <div key={v.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 11) * 35}ms` }}>
                <TikTokCard video={v} onPlay={() => onPlay(v, videos, label)} />
              </div>
            ))}
          </div>

          {data?.hasMore && (
            <div ref={sentinel} className="mt-12 flex flex-col items-center gap-3 pb-4">
              {moreFailed ? (
                <>
                  <p className="text-sm text-zinc-500">Couldn't load more videos.</p>
                  <button
                    onClick={() => void loadMore()}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    <RefreshCw className="h-4 w-4" /> Try again
                  </button>
                </>
              ) : (
                <button
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loadingMore ? "Loading more…" : "Load more"}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {!loading && !error && data && videos.length === 0 && <EmptyState title={emptyTitle} body={emptyBody} />}
    </div>
  );
}
