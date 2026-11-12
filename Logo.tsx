import { cn } from "../utils/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-gradient-ember relative inline-flex h-9 w-9 items-center justify-center rounded-xl shadow-lg shadow-orange-900/40",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-px text-ink" fill="currentColor" aria-hidden>
        <path d="M7 4.6v14.8a1 1 0 0 0 1.5.86l12.2-7.4a1 1 0 0 0 0-1.72L8.5 3.74A1 1 0 0 0 7 4.6Z" />
      </svg>
    </span>
  );
}

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember"
      aria-label="Lumen home"
    >
      <LogoMark className="transition-transform group-hover:scale-105" />
      <span className="font-display text-lg font-semibold tracking-tight text-white">Lumen</span>
    </button>
  );
}
