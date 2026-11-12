import { Check } from "lucide-react";

export function Toast({ message }: { message: string | null }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4" aria-live="polite">
      {message && (
        <div
          key={message}
          className="animate-pop-in flex items-center gap-2.5 rounded-full border border-white/10 bg-panel-2/95 py-2.5 pr-5 pl-3 text-sm font-medium text-white shadow-2xl shadow-black/60 backdrop-blur"
        >
          <span className="bg-gradient-ember grid h-5 w-5 place-items-center rounded-full text-ink">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          {message}
        </div>
      )}
    </div>
  );
}
