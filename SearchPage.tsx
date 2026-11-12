import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, Info, Loader2, RefreshCw, SearchX } from "lucide-react";
import type { Actions, VideoMeta } from "../types";
import { search, type NextToken } from "../lib/search";
import { remember } from "../lib/store";
import { GridSkeleton, VideoGrid } from "./VideoGrid";

interface Props {
  q: string;
  apiKey: string;
  localPool: VideoMeta[];
  actions: Actions;
  onOpenSettings: () => void;
}

interface Result {
  videos: VideoMeta[];
  next?: NextToken;
  notice?: string;
}

const cache = new Map<string, Result>();

export function SearchPage({ q, apiKey, localPool, actions, onOpenSettings }: Props) {
  const cacheKey = `${apiKey ? "key" : "free"}::${q.toLowerCase()}`;
  const [result, setResult] = useState<Result | null>(() => cache.get(cacheKey) ?? null);
  const [loading, setLoading] = useState(() => !cache.has(cacheKey));
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  // First page
  useEffect(() => {
    const cached = cache.get(cacheKey);
    if (cached) {
      setResult(cached);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setResult(null);
    search(q, apiKey)
      .then((out) => {
        if (cancelled) return;
        remember(out.videos);
        if (out.videos.length) cache.set(cacheKey, out);
        setResult(out);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [q, apiKey, cacheKey, attempt]);

  const retry = () => {
    cache.delete(cacheKey);
    setAttempt((n) => n + 1);
  };

  // More pages
  const loadMore = useCallback(async () => {
    if (!result?.next || busy.current) return;
    busy.current = true;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const page = await search(q, apiKey, result.next);
      remember(page.videos);
      const seen = new Set(result.videos.map((v) => v.id));
      const merged: Result = {
        ...result,
        videos: [...result.videos, ...page.videos.filter((v) => !seen.has(v.id))],
        next: page.next,
      };
      cache.set(cacheKey, merged);
      setResult(merged);
    } catch {
      setMoreFailed(true);
    } finally {
      busy.current = false;
      setLoadingMore(false);
    }
  }, [result, q, apiKey, cacheKey]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !result?.next || moreFailed || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void loadMore(), {
      rootMargin: "700px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [result, moreFailed, loadMore]);

  // What we already know locally, used as a safety net if live search is down.
  const localMatches = useMemo(() => {
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    const seen = new Set<string>();
    return localPool.filter((v) => {
      if (seen.has(v.id)) return false;
      const hay = `${v.title} ${v.channel}`.toLowerCase();
      if (!tokens.every((t) => hay.includes(t))) return false;
      seen.add(v.id);
      return true;
    });
  }, [q, localPool]);

  const shell = "mx-auto max-w-[1500px] px-4 py-8 sm:px-6";
  const videos = result?.videos ?? [];

  return (
    <div className={shell}>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="font-display text-xl font-semibold text-white">
          Results for “<span className="text-gradient">{q}</span>”
        </h1>
        {videos.length > 0 && (
          <span className="text-sm text-zinc-500">
            {videos.length}
            {result?.next ? "+" : ""} videos
          </span>
        )}
      </div>

      {loading && <GridSkeleton count={12} />}

      {result?.notice && (
        <div className="animate-pop-in mb-6 flex items-start gap-3 rounded-2xl border border-gold/25 bg-gold/6 p-4 text-sm">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          <p className="flex-1 leading-relaxed text-zinc-300">
            {result.notice}{" "}
            <button onClick={onOpenSettings} className="font-medium text-white underline underline-offset-4">
              Check API key
            </button>
          </p>
        </div>
      )}

      {error && (
        <>
          <div
            role="alert"
            className="animate-pop-in mb-10 flex flex-col gap-4 rounded-2xl border border-red-500/30 bg-red-500/8 p-5 sm:flex-row sm:items-center"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-300">
              <CircleAlert className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="font-display font-semibold text-white">Search didn't go through</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">{error}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                onClick={retry}
                className="bg-gradient-ember inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-ink hover:brightness-110"
              >
                <RefreshCw className="h-4 w-4" /> Try again
              </button>
              <button
                onClick={onOpenSettings}
                className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/15"
              >
                Add backup key
              </button>
            </div>
          </div>

          {localMatches.length > 0 && (
            <>
              <h2 className="mb-5 font-display text-base font-semibold text-white">
                Meanwhile, from your library
              </h2>
              <VideoGrid videos={localMatches} actions={actions} />
            </>
          )}
        </>
      )}

      {videos.length > 0 && (
        <>
          <VideoGrid videos={videos} actions={actions} />

          {result?.next && (
            <div ref={sentinel} className="mt-12 flex flex-col items-center gap-3 pb-4">
              {moreFailed ? (
                <>
                  <p className="text-sm text-zinc-500">Couldn't load more results.</p>
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

      {!loading && !error && result && videos.length === 0 && (
        <EmptyState
          title="No videos found"
          body={`Nothing came back for “${q}”. Check the spelling or try more general keywords.`}
        />
      )}
    </div>
  );
}

export function EmptyState({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="animate-fade-up mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/6 text-zinc-400">
        <SearchX className="h-6 w-6" />
      </span>
      <h2 className="mt-5 font-display text-lg font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
      {children}
    </div>
  );
}
