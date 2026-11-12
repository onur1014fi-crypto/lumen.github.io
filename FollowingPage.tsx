import { useCallback, useEffect, useMemo, useState } from "react";
import { Info, Plus, Users, X } from "lucide-react";
import type { Actions, Channel, Route } from "../types";
import { formatSubs } from "../lib/channels";
import { cn } from "../utils/cn";
import { AddChannel } from "./AddChannel";
import { ChannelAvatar } from "./ChannelAvatar";
import { ChannelView } from "./ChannelView";

interface Props {
  /** The channel being viewed (`UC…` or `@handle`). Without one, the first followed channel is shown. */
  refParam?: string;
  followed: Channel[];
  actions: Actions;
  onFollow: (channel: Channel) => void;
  onUnfollow: (id: string) => void;
  onNavigate: (route: Route) => void;
}

function ResetNote({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 text-xs leading-relaxed text-zinc-500", className)}>
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>Followed channels aren't saved. This list starts fresh every time you open Lumen.</span>
    </p>
  );
}

export function FollowingPage({ refParam, followed, actions, onFollow, onUnfollow, onNavigate }: Props) {
  const [adding, setAdding] = useState(false);
  const [resolved, setResolved] = useState<{ ref: string; id: string } | null>(null);

  const followedIds = useMemo(() => new Set(followed.map((c) => c.id)), [followed]);
  const activeRef = refParam ?? followed[0]?.id;
  const activeId = activeRef ? (resolved?.ref === activeRef ? resolved.id : activeRef) : undefined;

  const open = useCallback((ref: string) => onNavigate({ name: "channel", ref }), [onNavigate]);
  const handleResolved = useCallback((ref: string, id: string) => setResolved({ ref, id }), []);

  useEffect(() => {
    if (!activeRef) document.title = "Following · Lumen";
  }, [activeRef]);

  useEffect(() => {
    if (!adding) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAdding(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [adding]);

  /* ---------- Nothing followed and nothing being viewed ---------- */
  if (!activeRef) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="animate-fade-up text-center">
          <span className="bg-gradient-ember mx-auto grid h-14 w-14 place-items-center rounded-2xl text-ink shadow-lg shadow-orange-900/40">
            <Users className="h-6 w-6" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Follow your favourite channels
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-zinc-400">
            Each channel you follow gets its own space with <em className="text-zinc-200 not-italic">every</em> video it
            has published, kept apart from all the others.
          </p>
        </div>
        <div className="animate-fade-up mt-10" style={{ animationDelay: "100ms" }}>
          <AddChannel
            autoFocus
            followedIds={followedIds}
            onFollow={onFollow}
            onUnfollow={onUnfollow}
            onOpen={open}
          />
        </div>
        <ResetNote className="mt-8 justify-center" />
      </div>
    );
  }

  /* ---------- Rail of followed channels + the selected channel ---------- */
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)] lg:gap-10">
        <aside>
          <nav aria-label="Followed channels" className="lg:sticky lg:top-24">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="font-display text-sm font-semibold text-white">
                Following <span className="ml-1 font-sans font-normal text-zinc-500">{followed.length}</span>
              </h2>
              <button
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/15 hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>

            {followed.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm leading-relaxed text-zinc-500">
                You're not following anyone yet. Press <strong className="font-medium text-zinc-300">Follow</strong> on
                the channel to add it here.
              </p>
            ) : (
              <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
                {followed.map((c) => {
                  const active = c.id === activeId;
                  return (
                    <li key={c.id} className="group relative shrink-0">
                      <button
                        onClick={() => open(c.id)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-full border py-1.5 pr-4 pl-1.5 text-left transition focus-visible:outline-2 focus-visible:outline-ember",
                          "lg:rounded-xl lg:py-2 lg:pr-10 lg:pl-2",
                          active
                            ? "border-white/20 bg-white/10 text-white"
                            : "border-white/10 text-zinc-400 hover:bg-white/6 hover:text-white lg:border-transparent",
                        )}
                      >
                        <ChannelAvatar src={c.avatar} name={c.name} className="h-8 w-8 text-xs lg:h-10 lg:w-10 lg:text-sm" />
                        <span className="min-w-0">
                          <span className="block max-w-[10rem] truncate text-sm font-medium lg:max-w-none">{c.name}</span>
                          {c.subscribers != null && (
                            <span className="hidden truncate text-xs text-zinc-500 lg:block">
                              {formatSubs(c.subscribers)}
                            </span>
                          )}
                        </span>
                      </button>
                      <button
                        onClick={() => onUnfollow(c.id)}
                        aria-label={`Unfollow ${c.name}`}
                        title="Unfollow"
                        className="absolute top-1/2 right-2 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-zinc-500 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-white/10 hover:text-white lg:grid"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <ResetNote className="mt-5 hidden lg:flex" />
          </nav>
        </aside>

        <section className="min-w-0" aria-label="Channel videos">
          <ChannelView
            key={activeRef}
            refParam={activeRef}
            followedIds={followedIds}
            actions={actions}
            onFollow={onFollow}
            onUnfollow={onUnfollow}
            onResolved={handleResolved}
            onBack={() => onNavigate({ name: "following" })}
          />
          <ResetNote className="mt-10 lg:hidden" />
        </section>
      </div>

      {adding && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6"
          onMouseDown={(e) => e.target === e.currentTarget && setAdding(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-channel-title"
            className="animate-pop-in max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-white/10 bg-panel p-6 shadow-2xl sm:rounded-3xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 id="add-channel-title" className="font-display text-xl font-semibold text-white">
                Follow a channel
              </h2>
              <button
                onClick={() => setAdding(false)}
                className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <AddChannel
              autoFocus
              followedIds={followedIds}
              onFollow={onFollow}
              onUnfollow={onUnfollow}
              onOpen={(ref) => {
                setAdding(false);
                open(ref);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
