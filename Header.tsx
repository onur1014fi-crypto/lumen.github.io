import { Bookmark, Compass, History, Music2, Settings, Users } from "lucide-react";
import type { Route } from "../types";
import { cn } from "../utils/cn";
import { Logo } from "./Logo";
import { Omnibox } from "./Omnibox";

interface Props {
  route: Route;
  savedCount: number;
  followedCount: number;
  onSubmit: (text: string) => void;
  onNavigate: (route: Route) => void;
  onOpenSettings: () => void;
}

export function Header({ route, savedCount, followedCount, onSubmit, onNavigate, onOpenSettings }: Props) {
  const showOmnibox = route.name !== "home" && route.name !== "tiktok";

  const item = (active: boolean) =>
    cn(
      "relative inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-ember",
      active && "bg-white/10 text-white",
    );

  return (
    <header className="sticky top-0 z-40 border-b border-white/6 bg-ink/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <div className="order-1">
          <Logo onClick={() => onNavigate({ name: "home" })} />
        </div>

        <nav className="order-2 ml-auto flex items-center gap-0.5 md:order-3" aria-label="Main">
          <button
            className={item(route.name === "home")}
            onClick={() => onNavigate({ name: "home" })}
            aria-label="Discover"
          >
            <Compass className="h-[18px] w-[18px]" />
            <span className="hidden lg:inline">Discover</span>
          </button>
          <button
            className={item(route.name === "following" || route.name === "channel")}
            onClick={() => onNavigate({ name: "following" })}
            aria-label="Following"
          >
            <Users className="h-[18px] w-[18px]" />
            <span className="hidden lg:inline">Following</span>
            {followedCount > 0 && (
              <span className="bg-gradient-ember grid h-4.5 min-w-4.5 place-items-center rounded-full px-1 text-[10px] font-bold text-ink">
                {followedCount}
              </span>
            )}
          </button>
          <button
            className={item(route.name === "tiktok")}
            onClick={() => onNavigate({ name: "tiktok", view: { kind: "home" } })}
            aria-label="TikTok"
          >
            <Music2 className="h-[18px] w-[18px]" />
            <span className="hidden lg:inline">TikTok</span>
          </button>
          <button
            className={item(route.name === "saved")}
            onClick={() => onNavigate({ name: "saved" })}
            aria-label="Saved videos"
          >
            <Bookmark className="h-[18px] w-[18px]" />
            <span className="hidden lg:inline">Saved</span>
            {savedCount > 0 && (
              <span className="bg-gradient-ember grid h-4.5 min-w-4.5 place-items-center rounded-full px-1 text-[10px] font-bold text-ink">
                {savedCount}
              </span>
            )}
          </button>
          <button
            className={item(route.name === "history")}
            onClick={() => onNavigate({ name: "history" })}
            aria-label="Watch history"
          >
            <History className="h-[18px] w-[18px]" />
            <span className="hidden lg:inline">History</span>
          </button>
          <button className={item(false)} onClick={onOpenSettings} aria-label="Settings">
            <Settings className="h-[18px] w-[18px]" />
          </button>
        </nav>

        {showOmnibox && (
          <div className="order-3 w-full md:order-2 md:mx-auto md:w-auto md:max-w-2xl md:flex-1">
            <Omnibox initial={route.name === "search" ? route.q : ""} onSubmit={onSubmit} />
          </div>
        )}
      </div>
    </header>
  );
}
