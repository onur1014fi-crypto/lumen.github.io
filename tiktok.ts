import type { TikTokVideo, TikTokView } from "../types";
import { TT_ID_RE } from "./tiktokRef";

/* ------------------------------------------------------------------ */
/* Official TikTok embeds — these need no key and no account.          */
/*                                                                     */
/* `embed/v2/{id}` is TikTok's classic embed: it plays the real video. */
/* (The `player/v1` link that TikTok's oEmbed hands out only shows an  */
/* "open in the app" screen, so it is deliberately not used.)          */
/* ------------------------------------------------------------------ */

export const embedSrc = (id: string) => `https://www.tiktok.com/embed/v2/${id}`;
export const creatorEmbedSrc = (user: string) => `https://www.tiktok.com/embed/@${encodeURIComponent(user)}`;
export const profileUrl = (user: string) => `https://www.tiktok.com/@${encodeURIComponent(user)}`;
/** TikTok ignores which username sits in the path, so a generic one is fine when it's unknown. */
export const videoUrl = (id: string, user?: string) =>
  `https://www.tiktok.com/@${encodeURIComponent(user || "tiktok")}/video/${id}`;

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export function formatCount(n?: number) {
  if (n == null || !Number.isFinite(n)) return "";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatDuration(total?: number) {
  if (!total || total < 0) return "";
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* In-memory knowledge of what we've seen, and the list being browsed  */
/* ------------------------------------------------------------------ */

const known = new Map<string, TikTokVideo>();

export function rememberTikTok(input: TikTokVideo | TikTokVideo[]) {
  for (const v of Array.isArray(input) ? input : [input]) known.set(v.id, { ...known.get(v.id), ...v });
}

export const recallTikTok = (id: string) => known.get(id);

let context: { videos: TikTokVideo[]; label: string; from?: TikTokView } = { videos: [], label: "" };

/**
 * The list a video was opened from, so Previous / Next / "Up next" stay inside it.
 * `from` is the page that showed that list, so "Back to results" can return to it.
 */
export function setTikTokContext(videos: TikTokVideo[], label: string, from?: TikTokView) {
  context = { videos, label, from };
}
export const getTikTokContext = () => context;

/* ------------------------------------------------------------------ */
/* Recently watched (stored in this browser; ids only, no cover URLs   */
/* because TikTok's image links expire)                                */
/* ------------------------------------------------------------------ */

export interface TikTokRecent {
  id: string;
  user?: string;
  title?: string;
}

const RECENT_KEY = "lumen:tiktok-recent";
const RECENT_LIMIT = 12;

export function getRecentTikToks(): TikTokRecent[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter((r): r is TikTokRecent => !!r && typeof r.id === "string" && TT_ID_RE.test(r.id)).slice(0, RECENT_LIMIT)
      : [];
  } catch {
    return [];
  }
}

export function addRecentTikTok(entry: TikTokRecent) {
  try {
    const rest = getRecentTikToks();
    const prev = rest.find((r) => r.id === entry.id);
    const merged: TikTokRecent = { id: entry.id, user: entry.user || prev?.user, title: entry.title || prev?.title };
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify([merged, ...rest.filter((r) => r.id !== entry.id)].slice(0, RECENT_LIMIT)),
    );
  } catch {
    /* storage unavailable */
  }
}

export function clearRecentTikToks() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* storage unavailable */
  }
}

/* ------------------------------------------------------------------ */
/* Keyword search & creator videos — TikWM's official API.            */
/*                                                                     */
/* TikTok has no public search that a website can call without a key,  */
/* so this part switches on once the user adds their own key. The key  */
/* stays in this browser and is only ever sent to api.tikwmapi.com.    */
/* ------------------------------------------------------------------ */

const API = "https://api.tikwmapi.com";

export interface TikTokPageData {
  videos: TikTokVideo[];
  cursor?: string;
  hasMore: boolean;
}

const str = (x: unknown) => (typeof x === "string" ? x : "");
const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : undefined);

/** Turns one entry of the API's `videos` array into our shape (or null if it can't be played). */
export function mapTikTokVideo(raw: unknown): TikTokVideo | null {
  if (!raw || typeof raw !== "object") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = raw as any;
  const id = String(r.video_id ?? r.id ?? "");
  if (!TT_ID_RE.test(id)) return null;

  const fromParts = Array.isArray(r.content_desc)
    ? r.content_desc.filter((p: unknown) => typeof p === "string" && p.trim()).join(" ")
    : "";

  return {
    id,
    title: (str(r.title) || fromParts).trim(),
    user: str(r.author?.unique_id),
    nickname: str(r.author?.nickname) || undefined,
    avatar: str(r.author?.avatar) || undefined,
    cover: str(r.cover) || str(r.origin_cover) || undefined,
    duration: num(r.duration),
    plays: num(r.play_count),
    likes: num(r.digg_count),
    comments: num(r.comment_count),
    created: num(r.create_time),
  };
}

async function call(path: string, params: Record<string, string>, key: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}?${new URLSearchParams(params)}`, {
      headers: { Accept: "application/json", "x-tikwmapi-key": key },
    });
  } catch {
    throw new Error("Couldn't reach the TikTok search service. Check your connection and try again.");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = await res.json().catch(() => null);
  const message = String(body?.message ?? body?.msg ?? "");

  if (res.status === 401 || res.status === 403) {
    throw new Error("The TikTok API rejected this key. Double-check it in Settings.");
  }
  if (res.status === 429 || /rate limit/i.test(message)) {
    throw new Error("TikTok search is being rate limited. Wait a few seconds and try again.");
  }
  if (!res.ok) throw new Error(message || `TikTok search failed (${res.status}).`);
  if (body && typeof body.code === "number" && body.code !== 0) {
    throw new Error(message || "TikTok search failed. Try again.");
  }
  return body?.data;
}

export function toPage(data: unknown): TikTokPageData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  const list: unknown[] = Array.isArray(d?.videos) ? d.videos : [];
  const seen = new Set<string>();
  const videos: TikTokVideo[] = [];
  for (const raw of list) {
    const v = mapTikTokVideo(raw);
    if (v && !seen.has(v.id)) {
      seen.add(v.id);
      videos.push(v);
    }
  }
  const cursor = d?.cursor != null && d.cursor !== "" ? String(d.cursor) : undefined;
  return { videos, cursor, hasMore: !!d?.hasMore && !!cursor && videos.length > 0 };
}

export async function searchTikTok(q: string, key: string, cursor?: string): Promise<TikTokPageData> {
  return toPage(await call("/feed/search", { keywords: q, count: "24", cursor: cursor ?? "0" }, key));
}

export async function tikTokUserPosts(user: string, key: string, cursor?: string): Promise<TikTokPageData> {
  return toPage(await call("/user/posts", { unique_id: user, count: "30", cursor: cursor ?? "0" }, key));
}
