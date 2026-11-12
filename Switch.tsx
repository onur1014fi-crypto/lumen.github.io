import { cn } from "../utils/cn";

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

export function Switch({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
        checked ? "bg-gradient-ember" : "bg-white/15",
      )}
    >
      <span
        className={cn(
          "inline-block h-4.5 w-4.5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5.5" : "translate-x-1",
        )}
      />
    </button>
  );
}
