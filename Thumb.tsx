import { useState } from "react";
import { thumb } from "../lib/youtube";
import { cn } from "../utils/cn";

interface Props {
  id: string;
  quality?: "mq" | "hq" | "maxres";
  className?: string;
}

/** Video thumbnail that gracefully falls back when the high-res version doesn't exist. */
export function Thumb({ id, quality = "mq", className }: Props) {
  const [q, setQ] = useState(quality);
  return (
    <img
      src={thumb(id, q)}
      alt=""
      loading="lazy"
      draggable={false}
      className={cn("h-full w-full object-cover", className)}
      onLoad={(e) => {
        // YouTube serves a 120px placeholder when maxres is missing.
        if (q === "maxres" && e.currentTarget.naturalWidth <= 120) setQ("hq");
      }}
      onError={() => {
        if (q === "maxres") setQ("hq");
        else if (q === "hq") setQ("mq");
      }}
    />
  );
}
