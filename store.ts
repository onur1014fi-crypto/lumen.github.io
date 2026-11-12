import type { VideoMeta } from "../types";

/** In-memory lookup so any video we've seen can be titled instantly. */
const store = new Map<string, VideoMeta>();

export function remember(input: VideoMeta | VideoMeta[]) {
  for (const v of Array.isArray(input) ? input : [input]) {
    store.set(v.id, { ...store.get(v.id), ...v });
  }
}

export function recall(id: string): VideoMeta | undefined {
  return store.get(id);
}

/** The pool re-ordered so it starts right after `id` (and wraps around). */
export function rotateAfter(pool: VideoMeta[], id: string): VideoMeta[] {
  const i = pool.findIndex((v) => v.id === id);
  if (i === -1) return pool;
  return [...pool.slice(i + 1), ...pool.slice(0, i)];
}
