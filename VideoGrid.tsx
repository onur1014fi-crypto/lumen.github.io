import type { Actions, VideoMeta } from "../types";
import { VideoCard } from "./VideoCard";

interface Props {
  videos: VideoMeta[];
  actions: Actions;
  activeId?: string;
  /** The full list to play from, when `videos` is only a visible slice of it. */
  context?: VideoMeta[];
  /** Names the list (e.g. a channel) so "Up next" can say where it came from. */
  contextLabel?: string;
  hideChannel?: boolean;
}

export function VideoGrid({ videos, actions, activeId, context, contextLabel, hideChannel }: Props) {
  return (
    <div className="grid gap-x-4 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((video, i) => (
        <div key={video.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 11) * 35}ms` }}>
          <VideoCard
            video={video}
            actions={actions}
            active={video.id === activeId}
            hideChannel={hideChannel}
            onPlay={() => actions.play(video, context ?? videos, contextLabel)}
          />
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-x-4 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div className="skeleton aspect-video rounded-xl" />
          <div className="skeleton mt-3 h-3.5 w-11/12 rounded" />
          <div className="skeleton mt-2 h-3 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}
