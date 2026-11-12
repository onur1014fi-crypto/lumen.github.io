import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, Check, CircleAlert, Play, RefreshCw, Search, Square, UserPlus } from "lucide-react";
import type { Actions, Channel, ChannelDetails } from "../types";
import { formatSubs, type TabKey } from "../lib/channels";
import { useChannelDetails, useFeed } from "../lib/useChannel";
import { cn } from "../utils/cn";
import { Spinner } from "./AddChannel";
import { ChannelAvatar } from "./ChannelAvatar";
import { EmptyState } from "./SearchPage";
import { GridSkeleton, VideoGrid } from "./VideoGrid";

const PAGE = 48;

interface Props {
  /** `UC…` id or `@handle`. */
  refParam: string;
  followedIds: Set<string>;
  actions: Actions;
  onFollow: (channel: Channel) => void;
  onUnfollow: (id: string) => void;
  onResolved: (ref: string, id: string) => void;
  onBack: () => void;
}

/** One channel, on its own: header, tabs, and its complete list of videos. */
export function ChannelView({ refParam, followedIds, actions, onFollow, onUnfollow, onResolved, onBack }: Props) {
  const { state, retry } = useChannelDetails(refParam);
  const channel = state.status === "ready" ? state.channel : null;

  useEffect(() => {
    if (!channel) return;
    onResolved(refParam, channel.id);
    document.title = `${channel.name} · Lumen`;
  }, [channel, refParam, onResolved]);

  if (state.status === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading channel">
        <div className="skeleton h-52 rounded-3xl" />
        <div className="mt-8">
          <GridSkeleton count={8} />
        </div>
      </div>
    );
  }

  if (state.status === "error" || !channel) {
    return (
      <div
        role="alert"
        className="animate-pop-in flex flex-col gap-4 rounded-2xl border border-red-500/30 bg-red-500/8 p-5 sm:flex-row sm:items-center"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-300">
          <CircleAlert className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="font-display font-semibold text-white">Couldn't open this channel</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">
            It may not exist, or YouTube's lookup is busy right now. Try again in a moment.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={retry}
            className="bg-gradient-ember inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-ink hover:brightness-110"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
          <button
            onClick={onBack}
            className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/15"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <ChannelContent
      key={channel.id}
      channel={channel}
      following={followedIds.has(channel.id)}
      actions={actions}
      onFollow={onFollow}
      onUnfollow={onUnfollow}
    />
  );
}

function ChannelContent({
  channel,
  following,
  actions,
  onFollow,
  onUnfollow,
}: {
  channel: ChannelDetails;
  following: boolean;
  actions: Actions;
  onFollow: (channel: Channel) => void;
  onUnfollow: (id: string) => void;
}) {
  const [tab, setTab] = useState<TabKey>("videos");
  const [expanded, setExpanded] = useState(false);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "videos", label: "Videos" },
    ...(channel.tabs.shorts ? [{ key: "shorts" as const, label: "Shorts" }] : []),
    ...(channel.tabs.live ? [{ key: "live" as const, label: "Live" }] : []),
  ];

  const subs = formatSubs(channel.subscribers);
  const longDescription = (channel.description?.length ?? 0) > 150;

  return (
    <div>
      <header className="animate-fade-up overflow-hidden rounded-3xl border border-white/8 bg-panel/70">
        <div className="relative h-24 sm:h-36">
          {channel.banner ? (
            <>
              <img
                src={channel.banner}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-panel/90 via-transparent to-transparent" />
            </>
          ) : (
            <div className="bg-gradient-ember h-full w-full opacity-25" />
          )}
        </div>

        <div className="relative px-5 pb-5 sm:px-7">
          <div className="-mt-9 flex flex-wrap items-end gap-x-5 gap-y-4 sm:-mt-11">
            <ChannelAvatar
              src={channel.avatar}
              name={channel.name}
              className="h-[72px] w-[72px] text-2xl ring-4 ring-panel sm:h-[88px] sm:w-[88px] sm:text-3xl"
            />
            <div className="mt-9 min-w-0 flex-1 pb-1 sm:mt-0">
              <h1 className="flex items-center gap-2 font-display text-2xl leading-tight font-semibold tracking-tight text-white">
                <span className="truncate">{channel.name}</span>
                {channel.verified && <BadgeCheck className="h-5 w-5 shrink-0 text-zinc-400" aria-label="Verified" />}
              </h1>
              {subs && <p className="mt-0.5 text-sm text-zinc-500">{subs}</p>}
            </div>
            <button
              onClick={() => (following ? onUnfollow(channel.id) : onFollow(channel))}
              aria-pressed={following}
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition sm:w-auto",
                following
                  ? "bg-gold/15 text-gold hover:bg-gold/20"
                  : "bg-gradient-ember text-ink shadow-lg shadow-orange-900/30 hover:brightness-110",
              )}
            >
              {following ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {following ? "Following" : "Follow"}
            </button>
          </div>

          {channel.description && (
            <div className="mt-4 max-w-3xl">
              <p
                className={cn(
                  "text-sm leading-relaxed text-zinc-400",
                  expanded ? "whitespace-pre-line" : "line-clamp-2",
                )}
              >
                {expanded ? channel.description : channel.description.replace(/\s+/g, " ")}
              </p>
              {longDescription && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-1 text-sm font-medium text-zinc-300 transition hover:text-white"
                >
                  {expanded ? "Show less" : "More"}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {tabs.length > 1 && (
        <div className="mt-6 flex gap-1 border-b border-white/8" role="tablist" aria-label="Channel sections">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition",
                tab === t.key
                  ? "border-ember text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-200",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Keyed per channel + tab, so every feed has its own list and its own scroll state. */}
      <ChannelVideos key={`${channel.id}|${tab}`} channel={channel} tab={tab} actions={actions} />
    </div>
  );
}

function ChannelVideos({ channel, tab, actions }: { channel: ChannelDetails; tab: TabKey; actions: Actions }) {
  const { feed, loading, loadingAll, error, loadMore, loadAll, stop } = useFeed(channel, tab);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return feed.videos;
    return feed.videos.filter((v) => {
      const title = v.title.toLowerCase();
      return tokens.every((t) => title.includes(t));
    });
  }, [feed.videos, query]);

  const visible = filtered.slice(0, shown);
  const hasMoreToReveal = shown < filtered.length;
  const busy = loading || loadingAll;

  useEffect(() => setShown(PAGE), [query]);

  // A tab that hasn't been opened yet fetches its first page right away; it doesn't wait for scrolling.
  useEffect(() => {
    if (!feed.started && !feed.done) void loadMore();
  }, [feed.started, feed.done, loadMore]);

  // Infinite scroll: reveal what's already loaded first, then fetch the next page.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (hasMoreToReveal) setShown((s) => s + PAGE);
        else if (!feed.done && !busy && !error) void loadMore();
      },
      { rootMargin: "800px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMoreToReveal, feed.done, busy, error, loadMore, filtered.length, shown]);

  const noun = tab === "shorts" ? "Shorts" : tab === "live" ? "live streams" : "videos";
  const total = feed.videos.length;

  const status = query
    ? `${filtered.length} of ${total}${feed.done ? "" : "+"} ${noun} match`
    : feed.done
      ? `${total} ${noun}`
      : `${total}${total ? "+" : ""} ${noun} loaded`;

  const showSkeleton = total === 0 && !feed.done && !error;

  return (
    <section className="mt-6" aria-label={`${channel.name} ${noun}`}>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="relative block min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder={`Filter ${channel.name}'s ${noun}…`}
            aria-label={`Filter ${noun} from ${channel.name}`}
            className="w-full rounded-full border border-white/10 bg-panel/80 py-2.5 pr-4 pl-10 text-sm text-white placeholder:text-zinc-500 focus:border-ember/60 focus:ring-4 focus:ring-ember/15 focus:outline-none"
          />
        </label>

        <span className="text-sm text-zinc-500" aria-live="polite">
          {status}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!feed.done &&
            (loadingAll ? (
              <button
                onClick={stop}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/15"
              >
                <Square className="h-3.5 w-3.5" fill="currentColor" /> Stop
                <span className="tabular-nums text-zinc-500">{total}</span>
              </button>
            ) : (
              <button
                onClick={() => void loadAll()}
                disabled={loading}
                className="rounded-full bg-white/8 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/15 hover:text-white disabled:opacity-50"
                title="Keep loading until every video is here"
              >
                Load all
              </button>
            ))}
          <button
            onClick={() => filtered[0] && actions.play(filtered[0], filtered, channel.name)}
            disabled={filtered.length === 0}
            className="bg-gradient-ember inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-40"
          >
            <Play className="h-4 w-4" fill="currentColor" /> Play all
          </button>
        </div>
      </div>

      {showSkeleton && <GridSkeleton count={8} />}

      {visible.length > 0 && (
        <VideoGrid videos={visible} context={filtered} contextLabel={channel.name} hideChannel actions={actions} />
      )}

      {feed.done && total === 0 && (
        <EmptyState
          title={`No ${noun} here`}
          body={`${channel.name} hasn't published any ${noun} that can be shown.`}
        />
      )}

      {feed.done && total > 0 && filtered.length === 0 && (
        <EmptyState title="No matches" body={`None of ${channel.name}'s ${noun} match “${query}”.`} />
      )}

      {(hasMoreToReveal || !feed.done) && (
        <div ref={sentinel} className="mt-12 flex flex-col items-center gap-3 pb-4">
          {error ? (
            <>
              <p className="text-sm text-zinc-500">{error}</p>
              <button
                onClick={() => void loadMore()}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <RefreshCw className="h-4 w-4" /> Try again
              </button>
            </>
          ) : busy ? (
            <span className="inline-flex items-center gap-2 text-sm text-zinc-500">
              <Spinner className="h-4 w-4" /> Loading {noun}…
            </span>
          ) : (
            <button
              onClick={() => (hasMoreToReveal ? setShown((s) => s + PAGE) : void loadMore())}
              className="rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Load more
            </button>
          )}
        </div>
      )}

      {feed.done && total > 0 && !hasMoreToReveal && (
        <p className="mt-12 flex items-center justify-center gap-2 pb-4 text-sm text-zinc-500">
          <Check className="h-4 w-4 text-gold" /> That's everything: all {total} {noun}.
        </p>
      )}
    </section>
  );
}
