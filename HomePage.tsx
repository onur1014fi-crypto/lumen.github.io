import { useMemo, useState } from "react";
import { ArrowRight, Dices, Link2, ListVideo, Music2, Play, ShieldCheck, Users } from "lucide-react";
import type { Actions, Route, VideoMeta } from "../types";
import { ALL_CURATED, CATEGORIES, FEATURED } from "../data/curated";
import { cn } from "../utils/cn";
import { Omnibox } from "./Omnibox";
import { Thumb } from "./Thumb";
import { VideoGrid } from "./VideoGrid";

interface Props {
  history: VideoMeta[];
  actions: Actions;
  onSubmit: (text: string) => void;
  onNavigate: (route: Route) => void;
}

export function HomePage({ history, actions, onSubmit, onNavigate }: Props) {
  const [cat, setCat] = useState<string>("all");

  const videos = useMemo(
    () => (cat === "all" ? ALL_CURATED : (CATEGORIES.find((c) => c.key === cat)?.videos ?? ALL_CURATED)),
    [cat],
  );

  const surprise = () => {
    const pick = ALL_CURATED[Math.floor(Math.random() * ALL_CURATED.length)];
    actions.play(pick, ALL_CURATED);
  };

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-ember",
      active
        ? "border-transparent bg-white text-ink"
        : "border-white/10 bg-white/4 text-zinc-300 hover:border-white/25 hover:text-white",
    );

  return (
    <div className="pb-8">
      {/* Hero */}
      <section className="relative mx-auto grid max-w-[1500px] items-center gap-10 px-4 pt-10 pb-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
        <div className="animate-fade-up relative z-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300">
            <span className="bg-gradient-ember h-1.5 w-1.5 rounded-full" />
            Plays right here · no YouTube tab needed
          </span>
          <h1 className="mt-5 font-display text-4xl leading-[1.05] font-semibold tracking-tight text-white sm:text-6xl">
            Watch YouTube,
            <br />
            <span className="text-gradient">without the detour.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Search by keyword or paste a link, and it plays instantly in a clean, focused player. No account, no feed, no
            comments, no rabbit holes.
          </p>

          <div className="mt-8 max-w-2xl">
            <Omnibox size="lg" onSubmit={onSubmit} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1 text-zinc-500">Try:</span>
            {["lofi beats", "3Blue1Brown", "how volcanoes work", "pasta carbonara"].map((term) => (
              <button
                key={term}
                onClick={() => onSubmit(term)}
                className="rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-zinc-300 transition hover:border-white/25 hover:text-white"
              >
                {term}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <button
              onClick={surprise}
              className="inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 font-medium text-zinc-200 transition hover:bg-white/15 hover:text-white"
            >
              <Dices className="h-4 w-4" /> Surprise me
            </button>
            <button
              onClick={() => onNavigate({ name: "tiktok", view: { kind: "home" } })}
              className="inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 font-medium text-zinc-200 transition hover:bg-white/15 hover:text-white"
            >
              <Music2 className="h-4 w-4" /> Watch TikTok
            </button>
            <button
              onClick={() => onNavigate({ name: "following" })}
              className="inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 font-medium text-zinc-200 transition hover:bg-white/15 hover:text-white"
            >
              <Users className="h-4 w-4" /> Follow a channel
            </button>
            <button
              onClick={() => onNavigate({ name: "saved" })}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-zinc-400 transition hover:text-white"
            >
              <ListVideo className="h-4 w-4" /> Your saved list
            </button>
          </div>

          <ul className="mt-10 grid max-w-2xl gap-4 text-sm text-zinc-400 sm:grid-cols-3">
            {[
              { icon: Link2, text: "Search by keyword, or paste any youtube.com, youtu.be or Shorts link" },
              { icon: ListVideo, text: "Queue, save and resume your history" },
              { icon: ShieldCheck, text: "Privacy-friendly player, nothing to sign in to" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span className="leading-snug">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Featured */}
        <div className="animate-fade-up relative" style={{ animationDelay: "120ms" }}>
          <div className="bg-gradient-ember absolute -inset-4 -z-10 rounded-[2rem] opacity-20 blur-3xl" aria-hidden />
          <button
            onClick={() => actions.play(FEATURED, ALL_CURATED)}
            className="group relative block w-full overflow-hidden rounded-3xl text-left ring-1 ring-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember"
            aria-label={`Play featured video: ${FEATURED.title}`}
          >
            <div className="relative aspect-video">
              <Thumb id={FEATURED.id} quality="maxres" className="transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <span className="bg-gradient-ember absolute top-1/2 left-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-ink shadow-2xl transition group-hover:scale-110">
                <Play className="h-7 w-7 translate-x-0.5" fill="currentColor" />
              </span>
              <div className="absolute inset-x-0 bottom-0 p-5">
                <span className="text-[11px] font-semibold tracking-widest text-gold uppercase">Featured</span>
                <p className="mt-1 line-clamp-2 font-display text-lg leading-snug font-semibold text-white">
                  {FEATURED.title}
                </p>
                <p className="mt-0.5 text-sm text-zinc-300">{FEATURED.channel}</p>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Continue watching */}
      {history.length > 0 && (
        <section className="mx-auto max-w-[1500px] px-4 pb-12 sm:px-6">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="font-display text-xl font-semibold text-white">Pick up where you left off</h2>
            <button
              onClick={() => onNavigate({ name: "history" })}
              className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white"
            >
              Full history <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <VideoGrid videos={history.slice(0, 4)} actions={actions} />
        </section>
      )}

      {/* Discover */}
      <section className="mx-auto max-w-[1500px] px-4 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-xl font-semibold text-white">Discover</h2>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Categories">
            <button role="tab" aria-selected={cat === "all"} className={chip(cat === "all")} onClick={() => setCat("all")}>
              All
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                role="tab"
                aria-selected={cat === c.key}
                className={chip(cat === c.key)}
                onClick={() => setCat(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <VideoGrid key={cat} videos={videos} actions={actions} />
      </section>
    </div>
  );
}
