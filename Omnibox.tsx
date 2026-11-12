import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ClipboardPaste, Clock, Play, Search, Users, X } from "lucide-react";
import type { VideoMeta } from "../types";
import { parseChannelInput } from "../lib/channelRef";
import { clearRecents, getRecents, removeRecent } from "../lib/recent";
import { fetchSuggestions } from "../lib/search";
import { recall, remember } from "../lib/store";
import { fetchOEmbed, looksLikeYouTubeLink, parseVideoId } from "../lib/youtube";
import { cn } from "../utils/cn";
import { Thumb } from "./Thumb";

interface Props {
  initial?: string;
  onSubmit: (text: string) => void;
  size?: "md" | "lg";
}

type Item = { kind: "link" } | { kind: "channel" } | { kind: "suggest"; text: string } | { kind: "recent"; text: string };

/**
 * One box for everything: type keywords to search (with live suggestions),
 * or paste a YouTube link to play it straight away.
 */
export function Omnibox({ initial = "", onSubmit, size = "md" }: Props) {
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [preview, setPreview] = useState<VideoMeta | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const listId = `${uid}-list`;
  const lg = size === "lg";

  const trimmed = value.trim();
  const link = useMemo(() => parseVideoId(trimmed), [trimmed]);
  const chan = useMemo(() => (link ? null : parseChannelInput(trimmed)), [link, trimmed]);
  const urlish = !!link || !!chan || looksLikeYouTubeLink(trimmed);

  useEffect(() => setValue(initial), [initial]);

  // Press "/" anywhere to jump to the box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Live suggestions while typing keywords.
  useEffect(() => {
    if (!open || !trimmed || urlish) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      fetchSuggestions(trimmed).then((list) => {
        if (!cancelled) setSuggestions(list);
      });
    }, 130);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [trimmed, open, urlish]);

  // Preview the video when a link is pasted.
  useEffect(() => {
    if (!open || !link) {
      setPreview(null);
      return;
    }
    const known = recall(link);
    if (known) {
      setPreview(known);
      return;
    }
    setPreview({ id: link, title: "", channel: "" });
    let cancelled = false;
    const t = window.setTimeout(() => {
      fetchOEmbed(link).then((meta) => {
        if (cancelled || !meta) return;
        remember(meta);
        setPreview(meta);
      });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [link, open]);

  const items: Item[] = useMemo(() => {
    if (link) return [{ kind: "link" }];
    if (chan) return [{ kind: "channel" }];
    if (urlish) return [];
    if (trimmed) return suggestions.map((text) => ({ kind: "suggest", text }));
    return recents.map((text) => ({ kind: "recent", text }));
  }, [link, chan, urlish, trimmed, suggestions, recents]);

  useEffect(() => setActive(-1), [items.length, trimmed]);

  const showList = open && items.length > 0;

  const go = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setValue(t);
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
    onSubmit(t);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const item = active >= 0 ? items[active] : undefined;
    go(item && (item.kind === "suggest" || item.kind === "recent") ? item.text : value);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!items.length) return;
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const down = e.key === "ArrowDown";
      const n = items.length;
      setActive((a) => (down ? (a + 1) % n : a <= 0 ? n - 1 : a - 1));
    } else if (e.key === "Escape") {
      if (open) {
        setOpen(false);
        setActive(-1);
      } else {
        inputRef.current?.blur();
      }
    }
  };

  const paste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) go(text);
    } catch {
      inputRef.current?.focus();
    }
  };

  const row = (i: number) =>
    cn(
      "flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm text-zinc-200 transition-colors",
      active === i ? "bg-white/10" : "hover:bg-white/6",
    );

  return (
    <form
      onSubmit={submit}
      role="search"
      onFocus={() => {
        setRecents(getRecents());
        setOpen(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      className={cn(
        "group relative flex w-full items-center gap-2 border border-white/10 bg-panel/90 shadow-lg shadow-black/30 backdrop-blur transition",
        "focus-within:border-ember/60 focus-within:ring-4 focus-within:ring-ember/15",
        lg ? "rounded-2xl p-2 pl-5" : "rounded-full py-1 pr-1 pl-4",
      )}
    >
      <Search className={cn("shrink-0 text-zinc-500", lg ? "h-5 w-5" : "h-4 w-4")} aria-hidden />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${uid}-opt-${active}` : undefined}
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="Search videos, or paste a YouTube link…"
        aria-label="Search videos or paste a YouTube link"
        className={cn(
          "min-w-0 flex-1 bg-transparent text-white placeholder:text-zinc-500 focus:outline-none",
          lg ? "py-3 text-base sm:text-lg" : "py-2 text-sm",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
          }}
          className="rounded-full p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
          aria-label="Clear"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {lg && (
        <button
          type="button"
          onClick={paste}
          className="hidden items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white sm:inline-flex"
          title="Paste a link from your clipboard and play it"
        >
          <ClipboardPaste className="h-4 w-4" />
          Paste
        </button>
      )}
      <button
        type="submit"
        className={cn(
          "bg-gradient-ember shrink-0 font-semibold text-ink transition hover:brightness-110 active:scale-95",
          lg ? "rounded-xl px-6 py-3 text-base" : "rounded-full px-4 py-2 text-sm",
        )}
      >
        {link ? "Play" : chan ? "Open" : "Search"}
      </button>

      {showList && (
        <div
          id={listId}
          role="listbox"
          // Keep focus in the input while clicking rows.
          onMouseDown={(e) => e.preventDefault()}
          className="animate-pop-in absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-panel-2/95 py-2 shadow-2xl shadow-black/60 backdrop-blur-xl"
        >
          {link && (
            <div
              id={`${uid}-opt-0`}
              role="option"
              aria-selected={active === 0}
              className={cn(row(0), "gap-4 py-3")}
              onMouseEnter={() => setActive(0)}
              onClick={() => go(value)}
            >
              <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-panel ring-1 ring-white/10">
                <Thumb id={link} />
                <span className="bg-gradient-ember absolute inset-0 m-auto grid h-8 w-8 place-items-center rounded-full text-ink shadow-lg">
                  <Play className="h-3.5 w-3.5 translate-x-px" fill="currentColor" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold tracking-widest text-gold uppercase">Play this video</p>
                {preview?.title ? (
                  <>
                    <p className="mt-1 line-clamp-2 text-sm leading-snug font-medium text-white">{preview.title}</p>
                    {preview.channel && <p className="mt-0.5 truncate text-xs text-zinc-500">{preview.channel}</p>}
                  </>
                ) : (
                  <>
                    <div className="skeleton mt-1.5 h-3.5 w-4/5 rounded" />
                    <div className="skeleton mt-2 h-3 w-1/3 rounded" />
                  </>
                )}
              </div>
            </div>
          )}

          {chan && (
            <div
              id={`${uid}-opt-0`}
              role="option"
              aria-selected={active === 0}
              className={cn(row(0), "gap-4 py-3")}
              onMouseEnter={() => setActive(0)}
              onClick={() => go(value)}
            >
              <span className="bg-gradient-ember grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink">
                <Users className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold tracking-widest text-gold uppercase">Open channel</p>
                <p className="mt-0.5 truncate text-sm font-medium text-white">
                  {chan.kind === "handle" ? `@${chan.handle}` : "Channel link"}
                </p>
                <p className="truncate text-xs text-zinc-500">See every video, and follow it</p>
              </div>
            </div>
          )}

          {!link && !trimmed && (
            <div className="flex items-center justify-between px-4 pt-1 pb-1.5">
              <span className="text-[11px] font-semibold tracking-widest text-zinc-500 uppercase">Recent searches</span>
              <button
                type="button"
                onClick={() => {
                  clearRecents();
                  setRecents([]);
                }}
                className="text-xs text-zinc-500 transition hover:text-white"
              >
                Clear
              </button>
            </div>
          )}

          {items.map((item, i) => {
            if (item.kind === "link" || item.kind === "channel") return null;
            const isRecent = item.kind === "recent";
            const typed = trimmed.toLowerCase();
            const startsWith = !isRecent && typed && item.text.toLowerCase().startsWith(typed);
            return (
              <div
                key={`${item.kind}-${item.text}`}
                id={`${uid}-opt-${i}`}
                role="option"
                aria-selected={active === i}
                className={row(i)}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(item.text)}
              >
                {isRecent ? (
                  <Clock className="h-4 w-4 shrink-0 text-zinc-500" />
                ) : (
                  <Search className="h-4 w-4 shrink-0 text-zinc-500" />
                )}
                <span className="min-w-0 flex-1 truncate">
                  {startsWith ? (
                    <>
                      <span>{item.text.slice(0, trimmed.length)}</span>
                      <span className="font-semibold text-white">{item.text.slice(trimmed.length)}</span>
                    </>
                  ) : (
                    item.text
                  )}
                </span>
                {isRecent && (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={`Remove “${item.text}” from recent searches`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setRecents(removeRecent(item.text));
                    }}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </form>
  );
}
