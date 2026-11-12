import { useMemo, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Link2,
  ListPlus,
  ListX,
  MonitorPlay,
  SkipForward,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import type { Actions, VideoMeta } from "../types";
import { rotateAfter } from "../lib/store";
import { cn } from "../utils/cn";
import { Player } from "./Player";
import { Switch } from "./Switch";
import { VideoCard, VideoRow } from "./VideoCard";

interface Props {
  videoId: string;
  video?: VideoMeta;
  queue: VideoMeta[];
  pool: VideoMeta[];
  actions: Actions;
  autoplay: boolean;
  onAutoplayChange: (v: boolean) => void;
  theater: boolean;
  onTheaterChange: (v: boolean) => void;
  onEnded: () => void;
  onNext: () => void;
  onPlayQueued: (v: VideoMeta) => void;
  onRemoveQueued: (id: string) => void;
  onClearQueue: () => void;
  onCopyLink: () => void;
  /** Names the list this video was played from (e.g. a channel). */
  contextLabel?: string;
  following: boolean;
  onToggleFollow: () => Promise<void>;
  onOpenChannel: () => Promise<void>;
}

export function WatchPage(props: Props) {
  const {
    videoId,
    video,
    queue,
    pool,
    actions,
    autoplay,
    theater,
    onAutoplayChange,
    onTheaterChange,
    onEnded,
    onNext,
    onPlayQueued,
    onRemoveQueued,
    onClearQueue,
    onCopyLink,
    contextLabel,
    following,
    onToggleFollow,
    onOpenChannel,
  } = props;

  const [channelBusy, setChannelBusy] = useState(false);
  const withBusy = (fn: () => Promise<void>) => async () => {
    setChannelBusy(true);
    try {
      await fn();
    } finally {
      setChannelBusy(false);
    }
  };

  const saved = actions.savedIds.has(videoId);
  const queuedIds = useMemo(() => new Set(queue.map((q) => q.id)), [queue]);

  const suggestions = useMemo(
    () =>
      rotateAfter(pool, videoId)
        .filter((v) => v.id !== videoId && !queuedIds.has(v.id))
        .slice(0, 16),
    [pool, videoId, queuedIds],
  );

  const pill =
    "inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-ember";

  const initial = (video?.channel || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6">
      <div className={cn("grid gap-8", theater ? "grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_390px]")}>
        {/* Main column */}
        <div className="min-w-0">
          <div className={cn(theater && "mx-auto max-w-[1280px]")}>
            <Player key={videoId} videoId={videoId} onEnded={onEnded} onNext={onNext} />

            <div className="animate-fade-up mt-5">
              {video ? (
                <h1 className="font-display text-xl leading-snug font-semibold tracking-tight text-white sm:text-2xl">
                  {video.title}
                </h1>
              ) : (
                <div className="skeleton h-7 w-3/4 rounded-lg" />
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                  <button
                    onClick={withBusy(onOpenChannel)}
                    disabled={!video || channelBusy}
                    className="group flex min-w-0 items-center gap-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember disabled:cursor-wait"
                    title="See every video from this channel"
                  >
                    <span className="bg-gradient-ember grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-ink transition group-hover:scale-105">
                      {initial}
                    </span>
                    <span className="truncate text-sm font-medium text-zinc-300 transition group-hover:text-white">
                      {video ? video.channel || "YouTube" : <span className="skeleton inline-block h-4 w-32 rounded" />}
                    </span>
                  </button>
                  <button
                    className={cn(
                      pill,
                      "py-1.5",
                      following && "bg-gold/15 text-gold hover:bg-gold/20 hover:text-gold",
                    )}
                    onClick={withBusy(onToggleFollow)}
                    disabled={!video || channelBusy}
                    aria-pressed={following}
                    title={following ? "Unfollow this channel" : "Follow this channel to browse all of its videos"}
                  >
                    {channelBusy ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : following ? (
                      <UserCheck className="h-4 w-4" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    {following ? "Following" : "Follow"}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                  <button
                    className={cn(pill, saved && "bg-gold/15 text-gold hover:bg-gold/20 hover:text-gold")}
                    onClick={() => video && actions.toggleSave(video)}
                    disabled={!video}
                    aria-pressed={saved}
                  >
                    {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                    {saved ? "Saved" : "Save"}
                  </button>
                  <button
                    className={pill}
                    onClick={() => video && actions.enqueue(video)}
                    disabled={!video || queuedIds.has(videoId)}
                    title="Add this video to the queue"
                  >
                    <ListPlus className="h-4 w-4" /> Queue
                  </button>
                  <button className={pill} onClick={onCopyLink}>
                    <Link2 className="h-4 w-4" /> Share
                  </button>
                  <button
                    className={cn(pill, "hidden lg:inline-flex", theater && "bg-white/15 text-white")}
                    onClick={() => onTheaterChange(!theater)}
                    aria-pressed={theater}
                  >
                    <MonitorPlay className="h-4 w-4" /> Theater
                  </button>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-white/8 bg-panel/70 px-4 py-3">
                <label className="flex items-center gap-3 text-sm text-zinc-300">
                  <Switch checked={autoplay} onChange={onAutoplayChange} label="Autoplay next video" />
                  Autoplay next
                </label>
                <button
                  onClick={onNext}
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
                >
                  <SkipForward className="h-4 w-4" /> Next video
                </button>
                <span className="ml-auto hidden text-xs text-zinc-500 sm:block">
                  Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans text-zinc-300">/</kbd> to search
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className={cn("min-w-0", theater && "mx-auto w-full max-w-[1280px]")}>
          {queue.length > 0 && (
            <section className="animate-fade-up mb-7">
              <div className="mb-2 flex items-center justify-between px-1.5">
                <h2 className="font-display text-sm font-semibold text-white">
                  Queue <span className="ml-1 font-sans font-normal text-zinc-500">{queue.length}</span>
                </h2>
                <button
                  onClick={onClearQueue}
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-white"
                >
                  <ListX className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
              <div className="rounded-2xl border border-white/8 bg-panel/60 p-1.5">
                {queue.map((q) => (
                  <VideoRow
                    key={q.id}
                    video={q}
                    actions={actions}
                    onPlay={() => onPlayQueued(q)}
                    trailing={
                      <button
                        onClick={() => onRemoveQueued(q.id)}
                        className="absolute top-2 left-2 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-black [@media(hover:none)]:opacity-100"
                        aria-label="Remove from queue"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    }
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-2 px-1.5 font-display text-sm font-semibold text-white">
              {contextLabel ? `More from ${contextLabel}` : queue.length ? "Then keep watching" : "Up next"}
            </h2>
            {theater ? (
              <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                {suggestions.map((s) => (
                  <VideoCard key={s.id} video={s} actions={actions} onPlay={() => actions.play(s, pool, contextLabel)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {suggestions.map((s) => (
                  <VideoRow key={s.id} video={s} actions={actions} onPlay={() => actions.play(s, pool, contextLabel)} />
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
