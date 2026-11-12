import { useRef, useState } from "react";
import { BadgeCheck, Check, CircleAlert, Loader2, Search, UserPlus } from "lucide-react";
import type { Channel } from "../types";
import { parseChannelInput, refToString } from "../lib/channelRef";
import { channelRefForVideo, formatSubs, resolveChannel, searchChannels } from "../lib/channels";
import { parseVideoId } from "../lib/youtube";
import { cn } from "../utils/cn";
import { ChannelAvatar } from "./ChannelAvatar";

interface Props {
  followedIds: Set<string>;
  onFollow: (channel: Channel) => void;
  onUnfollow: (id: string) => void;
  /** Opens a channel's page. Accepts a `UC…` id or an `@handle`. */
  onOpen: (ref: string) => void;
  autoFocus?: boolean;
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; items: Channel[]; query: string; direct: boolean }
  | { status: "error"; message: string };

const SUGGESTED: { label: string; ref: string }[] = [
  { label: "Kurzgesagt", ref: "@kurzgesagt" },
  { label: "3Blue1Brown", ref: "@3blue1brown" },
  { label: "Veritasium", ref: "@veritasium" },
  { label: "Lofi Girl", ref: "@LofiGirl" },
  { label: "Fireship", ref: "@Fireship" },
  { label: "TED", ref: "@TED" },
];

/** Find a channel by name, @handle, channel link — or by pasting any of its video links. */
export function AddChannel({ followedIds, onFollow, onUnfollow, onOpen, autoFocus }: Props) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const ticket = useRef(0);

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = value.trim();
    if (!text) return;
    const mine = ++ticket.current;
    setState({ status: "loading" });

    const parsed = parseChannelInput(text);
    const videoId = parsed ? null : parseVideoId(text);

    try {
      let items: Channel[];
      let direct = false;
      if (parsed) {
        items = [await resolveChannel(refToString(parsed))];
        direct = true;
      } else if (videoId) {
        const target = await channelRefForVideo({ id: videoId, title: "", channel: "" });
        if (!target) throw new Error("no channel");
        items = [await resolveChannel(target.ref, target.hint)];
        direct = true;
      } else {
        items = await searchChannels(text);
      }
      if (mine === ticket.current) setState({ status: "done", items, query: text, direct });
    } catch (err) {
      if (mine !== ticket.current) return;
      const lookup = !!parsed || !!videoId;
      setState({
        status: "error",
        message: lookup
          ? "We couldn't find that channel. Check the link or @handle and try again."
          : ((err as Error).message ?? "Search failed. Try again."),
      });
    }
  };

  return (
    <div>
      <form
        onSubmit={run}
        role="search"
        className="flex items-center gap-2 rounded-2xl border border-white/10 bg-panel/90 p-1.5 pl-4 shadow-lg shadow-black/30 transition focus-within:border-ember/60 focus-within:ring-4 focus-within:ring-ember/15"
      >
        <Search className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus={autoFocus}
          type="text"
          enterKeyHint="search"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Channel name, @handle or link…"
          aria-label="Find a channel to follow"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none sm:text-base"
        />
        <button
          type="submit"
          disabled={!value.trim() || state.status === "loading"}
          className="bg-gradient-ember shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 active:scale-95 disabled:opacity-50"
        >
          Find
        </button>
      </form>

      <div className="mt-4" aria-live="polite">
        {state.status === "idle" && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1 text-zinc-500">Try:</span>
            {SUGGESTED.map((s) => (
              <button
                key={s.ref}
                onClick={() => onOpen(s.ref)}
                className="rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-zinc-300 transition hover:border-white/25 hover:text-white"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {state.status === "loading" && (
          <div className="space-y-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl border border-white/6 p-4">
                <div className="skeleton h-14 w-14 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3 rounded" />
                  <div className="skeleton h-3 w-2/3 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {state.status === "error" && (
          <div
            role="alert"
            className="animate-pop-in flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/8 p-4 text-sm text-red-200"
          >
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <p className="flex-1 leading-relaxed">{state.message}</p>
            <button onClick={() => void run()} className="font-medium text-white underline underline-offset-4">
              Retry
            </button>
          </div>
        )}

        {state.status === "done" && state.items.length === 0 && (
          <p className="rounded-2xl border border-white/8 bg-white/3 p-4 text-sm text-zinc-400">
            No channels found for “{state.query}”. Try the exact name, or paste the channel's link.
          </p>
        )}

        {state.status === "done" && state.items.length > 0 && (
          <ul className="space-y-2">
            {state.items.map((c) => (
              <li key={c.id} className="animate-pop-in">
                <ChannelCard
                  channel={c}
                  following={followedIds.has(c.id)}
                  onFollow={() => onFollow(c)}
                  onUnfollow={() => onUnfollow(c.id)}
                  onOpen={() => onOpen(c.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ChannelCard({
  channel,
  following,
  onFollow,
  onUnfollow,
  onOpen,
}: {
  channel: Channel;
  following: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  onOpen: () => void;
}) {
  const subs = formatSubs(channel.subscribers);
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-panel/60 p-4 transition hover:border-white/15 sm:flex-row sm:items-center">
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-4 text-left" aria-label={`Open ${channel.name}`}>
        <ChannelAvatar src={channel.avatar} name={channel.name} className="h-14 w-14 text-lg" />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-display font-semibold text-white">{channel.name}</span>
            {channel.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-zinc-400" aria-label="Verified" />}
          </span>
          {subs && <span className="mt-0.5 block text-xs text-zinc-500">{subs}</span>}
          {channel.description && (
            <span className="mt-1 line-clamp-2 text-sm leading-snug text-zinc-400">{channel.description}</span>
          )}
        </span>
      </button>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={onOpen}
          className="rounded-full bg-white/8 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/15 hover:text-white"
        >
          Videos
        </button>
        <button
          onClick={following ? onUnfollow : onFollow}
          aria-pressed={following}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
            following ? "bg-gold/15 text-gold hover:bg-gold/20" : "bg-gradient-ember text-ink hover:brightness-110",
          )}
        >
          {following ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {following ? "Following" : "Follow"}
        </button>
      </div>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("animate-spin", className)} />;
}
