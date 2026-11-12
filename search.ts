import type { VideoMeta } from "../types";
import { searchVideos } from "./youtube";

/* ------------------------------------------------------------------ */
/* Keyless YouTube search                                              */
/*                                                                     */
/* Lumen is a static site, so there is no server of our own to search  */
/* with. Instead we talk to community-run Piped API instances, which   */
/* expose YouTube search over CORS-enabled JSON. Instances come and go, */
/* so the list is refreshed from Piped's public directory, requests    */
/* are raced in small batches, and the last instance that worked is    */
/* tried first next time.                                              */
/* ------------------------------------------------------------------ */

const LIST_URL =
  "https://raw.githubusercontent.com/TeamPiped/documentation/refs/heads/main/content/docs/public-instances/index.md";
const LS_LIST = "lumen:piped-list";
const LS_PREFERRED = "lumen:piped-preferred";
const LIST_TTL = 12 * 60 * 60 * 1000;

/** Known instances, best first. The live directory is merged in after these. */
const CURATED = [
  "https://pipedapi.ducks.party",
  "https://api.piped.private.coffee",
  "https://pipedapi.darkness.services",
  "https://piped-api.codespace.cz",
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.nosebs.ru",
  "https://pipedapi-libre.kavin.rocks",
  "https://piped-api.privacy.com.de",
  "https://api.piped.yt",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.drgns.space",
  "https://pipedapi.owo.si",
  "https://pipedapi.reallyaweso.me",
  "https://pipedapi.orangenet.cc",
];

const MAX_ATTEMPTS = 12;
const BATCH_SIZES = [2, 3, 3, 4];
const REQUEST_TIMEOUT = 7000;

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export async function getJson<T>(url: string, ms: number, outer?: AbortSignal): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  const onAbort = () => ctrl.abort();
  outer?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener("abort", onAbort);
  }
}

/** Resolves with the first promise to fulfil; rejects only if all of them fail. */
function firstFulfilled<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let failed = 0;
    let firstError: unknown;
    promises.forEach((p) =>
      p.then(resolve, (e) => {
        if (failed === 0) firstError = e;
        if (++failed === promises.length) reject(firstError);
      }),
    );
  });
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- instance discovery ---------------- */

let discovered: string[] = [];
let discovery: Promise<void> | null = null;

export function startDiscovery(): Promise<void> {
  if (discovery) return discovery;

  const cached = lsGet<{ at: number; list: string[] }>(LS_LIST);
  if (cached && Array.isArray(cached.list) && Date.now() - cached.at < LIST_TTL) {
    discovered = cached.list;
    discovery = Promise.resolve();
    return discovery;
  }

  discovery = (async () => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(LIST_URL, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return;
      const md = await res.text();
      // Table rows look like: | name | https://api.example.com | location | cdn | badge |
      const list = [...md.matchAll(/\|\s*(https:\/\/[^\s|]+)\s*\|/g)].map((m) => m[1].replace(/\/+$/, ""));
      if (list.length) {
        discovered = [...new Set(list)];
        lsSet(LS_LIST, { at: Date.now(), list: discovered });
      }
    } catch {
      /* the curated list is enough */
    }
  })();
  return discovery;
}

function candidates(first?: string): string[] {
  const preferred = lsGet<string>(LS_PREFERRED);
  const known = new Set(CURATED);
  const extra = shuffle(discovered.filter((d) => !known.has(d)));
  const all = [first, preferred, ...CURATED, ...extra].filter((x): x is string => typeof x === "string" && !!x);
  return [...new Set(all)];
}

export async function viaPiped<T>(
  run: (base: string, signal: AbortSignal) => Promise<T>,
  first?: string,
): Promise<{ base: string; value: T }> {
  void startDiscovery();
  const list = candidates(first).slice(0, MAX_ATTEMPTS);

  let index = 0;
  let round = 0;
  while (index < list.length) {
    const size = BATCH_SIZES[Math.min(round, BATCH_SIZES.length - 1)];
    const group = list.slice(index, index + size);
    index += group.length;
    round++;

    const ctrl = new AbortController();
    try {
      const hit = await firstFulfilled(group.map(async (base) => ({ base, value: await run(base, ctrl.signal) })));
      ctrl.abort(); // cancel the slower requests in this batch
      lsSet(LS_PREFERRED, hit.base);
      return hit;
    } catch {
      /* try the next batch */
    }
  }
  throw new Error("no instance responded");
}

/* ---------------- mapping ---------------- */

export interface PipedItem {
  url?: string;
  uploaderUrl?: string;
  isShort?: boolean;
  type?: string;
  title?: string;
  uploaderName?: string;
  uploadedDate?: string | null;
  uploaded?: number;
  duration?: number;
  views?: number;
}

interface PipedPage {
  items?: PipedItem[];
  nextpage?: string | null;
}

function clock(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export function mapPipedItem(i: PipedItem): VideoMeta | null {
  if (i.type !== "stream" || !i.title) return null;
  const id = /[?&]v=([A-Za-z0-9_-]{11})(?:&|$)/.exec(i.url ?? "")?.[1];
  if (!id) return null;

  const video: VideoMeta = { id, title: i.title, channel: i.uploaderName ?? "" };
  const channelId = /\/channel\/(UC[\w-]{22})/.exec(i.uploaderUrl ?? "")?.[1];
  if (channelId) video.channelId = channelId;
  // Shorts also report a duration of -1, so check for them before calling something "live".
  const short = i.isShort === true;
  if (short) video.short = true;
  const live = i.duration === -1 && !short;
  if (live) video.live = true;
  else if (typeof i.duration === "number" && i.duration > 0) video.duration = clock(i.duration);
  if (!live && typeof i.views === "number" && i.views >= 0) video.views = i.views;
  if (typeof i.uploaded === "number" && i.uploaded > 0) video.published = new Date(i.uploaded).toISOString();
  else if (i.uploadedDate) video.publishedText = i.uploadedDate;
  return video;
}

/* ---------------- public search API ---------------- */

export type NextToken =
  | { kind: "api"; token: string }
  | { kind: "free"; token: string; base: string };

export interface SearchOutcome {
  videos: VideoMeta[];
  next?: NextToken;
  /** A non-fatal heads-up, e.g. the user's API key was rejected. */
  notice?: string;
}

const FRIENDLY_FAILURE =
  "Couldn't reach YouTube's search right now. Check your connection and try again in a moment.";

async function searchFree(q: string, next?: Extract<NextToken, { kind: "free" }>): Promise<SearchOutcome> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("You appear to be offline. Reconnect and try again.");
  }

  let sawEmpty = false;
  try {
    const { base, value } = await viaPiped(async (b, signal) => {
      const url = next
        ? `${b}/nextpage/search?nextpage=${encodeURIComponent(next.token)}&q=${encodeURIComponent(q)}&filter=videos`
        : `${b}/search?q=${encodeURIComponent(q)}&filter=videos`;
      const data = await getJson<PipedPage>(url, REQUEST_TIMEOUT, signal);
      if (!data || !Array.isArray(data.items)) throw new Error("unexpected response");
      // A blocked instance often answers 200 with nothing. Let another one confirm.
      if (!next && data.items.length === 0) {
        sawEmpty = true;
        throw new Error("empty");
      }
      return data;
    }, next?.base);

    const seen = new Set<string>();
    const videos = (value.items ?? [])
      .map(mapPipedItem)
      .filter((v): v is VideoMeta => !!v && !seen.has(v.id) && !!seen.add(v.id));
    return {
      videos,
      next: value.nextpage ? { kind: "free", token: value.nextpage, base } : undefined,
    };
  } catch {
    if (sawEmpty) return { videos: [] };
    throw new Error(FRIENDLY_FAILURE);
  }
}

/**
 * Keyword search. Uses the built-in keyless search by default; if the user has
 * added their own YouTube Data API key it is tried first, with the keyless
 * search as a safety net.
 */
export async function search(q: string, apiKey: string, next?: NextToken): Promise<SearchOutcome> {
  if (next?.kind === "api") {
    const page = await searchVideos(q, apiKey, next.token);
    return {
      videos: page.videos,
      next: page.nextPageToken ? { kind: "api", token: page.nextPageToken } : undefined,
    };
  }
  if (next?.kind === "free") return searchFree(q, next);

  let notice: string | undefined;
  if (apiKey) {
    try {
      const page = await searchVideos(q, apiKey);
      return {
        videos: page.videos,
        next: page.nextPageToken ? { kind: "api", token: page.nextPageToken } : undefined,
      };
    } catch (e) {
      notice = `${(e as Error).message} Showing results from Lumen's built-in search instead.`;
    }
  }

  const out = await searchFree(q);
  return notice ? { ...out, notice } : out;
}

/* ------------------------------------------------------------------ */
/* Autocomplete (Google's keyless suggest endpoint, via JSONP)         */
/* ------------------------------------------------------------------ */

export function parseSuggestions(payload: unknown): string[] {
  if (!Array.isArray(payload) || !Array.isArray(payload[1])) return [];
  const out: string[] = [];
  for (const entry of payload[1] as unknown[]) {
    const text = Array.isArray(entry) ? entry[0] : entry;
    if (typeof text === "string" && text.trim() && !out.includes(text)) out.push(text);
  }
  return out.slice(0, 8);
}

let jsonpSeq = 0;

export function fetchSuggestions(q: string): Promise<string[]> {
  return new Promise((resolve) => {
    const name = `__lumenSuggest${++jsonpSeq}`;
    const w = window as unknown as Record<string, unknown>;
    const script = document.createElement("script");
    let timer = 0;

    const done = (list: string[]) => {
      clearTimeout(timer);
      script.remove();
      // Leave a no-op behind in case a late response still arrives.
      w[name] = () => {
        delete w[name];
      };
      resolve(list);
    };

    w[name] = (payload: unknown) => {
      delete w[name];
      done(parseSuggestions(payload));
    };
    timer = window.setTimeout(() => done([]), 4000);
    script.onerror = () => done([]);
    script.async = true;
    script.src = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&hl=en&q=${encodeURIComponent(q)}&jsonp=${name}`;
    document.head.appendChild(script);
  });
}

// Warm the instance directory shortly after load so the first search is fast.
if (typeof window !== "undefined") {
  window.setTimeout(() => void startDiscovery(), 2500);
}
