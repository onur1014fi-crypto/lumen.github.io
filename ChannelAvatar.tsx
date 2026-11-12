import { useEffect, useState } from "react";
import { cn } from "../utils/cn";

interface Props {
  src?: string;
  name: string;
  /** Sizing, e.g. "h-10 w-10 text-sm". */
  className?: string;
}

/** Round channel picture with a coloured-initial fallback if it can't load. */
export function ChannelAvatar({ src, name, className }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <span
        aria-hidden
        className={cn("bg-gradient-ember grid shrink-0 place-items-center rounded-full font-bold text-ink", className)}
      >
        {(name.trim().charAt(0) || "?").toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      draggable={false}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-full bg-panel-2 object-cover", className)}
    />
  );
}
