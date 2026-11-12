import { Bookmark, History, Trash2 } from "lucide-react";
import type { Actions, Route, VideoMeta } from "../types";
import { cn } from "../utils/cn";
import { EmptyState } from "./SearchPage";
import { VideoGrid } from "./VideoGrid";

interface Props {
  tab: "saved" | "history";
  saved: VideoMeta[];
  history: VideoMeta[];
  actions: Actions;
  onNavigate: (route: Route) => void;
  onClear: (tab: "saved" | "history") => void;
}

export function LibraryPage({ tab, saved, history, actions, onNavigate, onClear }: Props) {
  const list = tab === "saved" ? saved : history;

  const tabBtn = (active: boolean) =>
    cn(
      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
      active ? "bg-white text-ink" : "text-zinc-400 hover:bg-white/8 hover:text-white",
    );

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-panel/70 p-1">
          <button className={tabBtn(tab === "saved")} onClick={() => onNavigate({ name: "saved" })}>
            <Bookmark className="h-4 w-4" /> Saved
            <span className="text-xs opacity-60">{saved.length}</span>
          </button>
          <button className={tabBtn(tab === "history")} onClick={() => onNavigate({ name: "history" })}>
            <History className="h-4 w-4" /> History
            <span className="text-xs opacity-60">{history.length}</span>
          </button>
        </div>
        {list.length > 0 && (
          <button
            onClick={() => onClear(tab)}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-zinc-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" /> Clear {tab === "saved" ? "saved" : "history"}
          </button>
        )}
      </div>

      {list.length > 0 ? (
        <VideoGrid videos={list} actions={actions} />
      ) : (
        <EmptyState
          title={tab === "saved" ? "Nothing saved yet" : "No watch history yet"}
          body={
            tab === "saved"
              ? "Tap the bookmark on any video to keep it here for later. It's stored privately in this browser."
              : "Videos you watch will show up here so you can jump back in. It's stored privately in this browser."
          }
        >
          <button
            onClick={() => onNavigate({ name: "home" })}
            className="bg-gradient-ember mt-6 rounded-xl px-5 py-2.5 text-sm font-semibold text-ink hover:brightness-110"
          >
            Browse Discover
          </button>
        </EmptyState>
      )}
    </div>
  );
}
