import type { VideoMeta } from "../types";
import { parseChannelInput } from "./channelRef";

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export const isVideoId = (s: string) => ID_RE.test(s);

/**
 * Pulls an 11-character video id out of any common YouTube link
 * (watch, youtu.be, shorts, embed, live, music.youtube.com) or a bare id.
 */
export function parseVideoId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;

  if (ID_RE.test(s)) {
    // Don't mistake 11-letter words like "programming" for a video id.
    return /^[A-Z]?[a-z]+$/.test(s) ? null : s;
  }

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www|m|music)\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return ID_RE.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    if (v && ID_RE.test(v)) return v;
    const m = url.pathname.match(/^\/(?:embed|shorts|live|v|e)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
  }

  return null;
}

export const looksLikeYouTubeLink = (s: string) => /(^|[/.])(youtu\.be|youtube\.com|youtube-nocookie\.com)/i.test(s);

export const thumb = (id: string, quality: "mq" | "hq" | "maxres" = "mq") =>
  `https://i.ytimg.com/vi/${id}/${quality}default.jpg`;

export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export function formatViews(n?: number) {
  if (n == null || Number.isNaN(n)) return "";
  return `${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n)} views`;
}

export function timeAgo(iso?: string) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, (Date.now() - t) / 1000);
  const units: [number, string][] = [
    [60 * 60 * 24 * 365, "year"],
    [60 * 60 * 24 * 30, "month"],
    [60 * 60 * 24 * 7, "week"],
    [60 * 60 * 24, "day"],
    [60 * 60, "hour"],
    [60, "minute"],
  ];
  for (const [secs, label] of units) {
    if (s >= secs) {
      const n = Math.floor(s / secs);
      return `${n} ${label}${n > 1 ? "s" : ""} ago`;
    }
  }
  return "just now";
}

function parseDuration(iso?: string): { text?: string; live: boolean } {
  if (!iso) return { live: false };
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return { live: false };
  const [d, h, min, sec] = [m[1], m[2], m[3], m[4]].map((x) => (x ? parseInt(x, 10) : 0));
  const total = d * 86400 + h * 3600 + min * 60 + sec;
  if (total === 0) return { live: true };
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const text =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : `${minutes}:${String(seconds).padStart(2, "0")}`;
  return { text, live: false };
}

function decodeEntities(s: string) {
  try {
    return new DOMParser().parseFromString(s, "text/html").documentElement.textContent ?? s;
  } catch {
    return s;
  }
}

/* ------------------------------------------------------------------ */
/* oEmbed (no API key needed) — used to name videos from pasted links  */
/* ------------------------------------------------------------------ */

export async function fetchOEmbed(id: string): Promise<VideoMeta | null> {
  const target = encodeURIComponent(watchUrl(id));
  const endpoints = [
    `https://www.youtube.com/oembed?url=${target}&format=json`,
    `https://noembed.com/embed?url=${target}`,
  ];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.title) {
        const meta: VideoMeta = { id, title: String(data.title), channel: String(data.author_name ?? "") };
        const ref = parseChannelInput(String(data.author_url ?? ""));
        if (ref?.kind === "id") meta.channelId = ref.id;
        else if (ref) meta.channelHandle = `@${ref.handle}`;
        return meta;
      }
    } catch {
      /* try next endpoint */
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* YouTube Data API v3 (optional, user-supplied key) — search          */
/* ------------------------------------------------------------------ */

async function api<T>(path: string, params: Record<string, string>, key: string): Promise<T> {
  const qs = new URLSearchParams({ ...params, key });
  let res: Response;
  try {
    res = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${qs}`);
  } catch {
    throw new Error("Couldn't reach YouTube's search service. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason: string | undefined = data?.error?.errors?.[0]?.reason;
    const message: string = data?.error?.message ?? "";
    if (reason === "quotaExceeded") {
      throw new Error("This API key has hit its daily search quota. Try again tomorrow or use another key.");
    }
    if (reason === "keyInvalid" || /api key not valid/i.test(message)) {
      throw new Error("YouTube rejected this API key. Double-check it in Settings.");
    }
    if (reason === "accessNotConfigured" || /has not been used|is disabled/i.test(message)) {
      throw new Error("Enable “YouTube Data API v3” for this key's Google Cloud project, then try again.");
    }
    if (reason === "ipRefererBlocked" || /referer/i.test(message)) {
      throw new Error("This API key has website restrictions that block this page. Remove them or allow this site.");
    }
    throw new Error(message || `Search failed (${res.status}).`);
  }
  return data as T;
}

interface SearchItem {
  id?: { videoId?: string };
  snippet?: { title?: string; channelTitle?: string; publishedAt?: string; liveBroadcastContent?: string };
}
interface VideoItem {
  id: string;
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string };
}

export interface SearchPage {
  videos: VideoMeta[];
  nextPageToken?: string;
}

export async function searchVideos(q: string, key: string, pageToken?: string): Promise<SearchPage> {
  const res = await api<{ items?: SearchItem[]; nextPageToken?: string }>(
    "search",
    {
      part: "snippet",
      type: "video",
      q,
      maxResults: "24",
      videoEmbeddable: "true",
      safeSearch: "moderate",
      ...(pageToken ? { pageToken } : {}),
    },
    key,
  );

  const videos: VideoMeta[] = (res.items ?? [])
    .filter((i) => i.id?.videoId)
    .map((i) => ({
      id: i.id!.videoId!,
      title: decodeEntities(i.snippet?.title ?? "Untitled"),
      channel: decodeEntities(i.snippet?.channelTitle ?? ""),
      published: i.snippet?.publishedAt,
      live: i.snippet?.liveBroadcastContent === "live",
    }));

  if (videos.length) {
    try {
      const details = await api<{ items?: VideoItem[] }>(
        "videos",
        { part: "contentDetails,statistics", id: videos.map((v) => v.id).join(",") },
        key,
      );
      const byId = new Map((details.items ?? []).map((d) => [d.id, d]));
      for (const v of videos) {
        const d = byId.get(v.id);
        if (!d) continue;
        const dur = parseDuration(d.contentDetails?.duration);
        v.duration = dur.text;
        if (dur.live) v.live = true;
        if (d.statistics?.viewCount) v.views = parseInt(d.statistics.viewCount, 10);
      }
    } catch {
      /* details are a nice-to-have */
    }
  }

  return { videos, nextPageToken: res.nextPageToken };
}

/* ------------------------------------------------------------------ */
/* IFrame Player API — lets us detect "ended" and playback errors      */
/* ------------------------------------------------------------------ */

export interface YTPlayerEvent {
  data: number;
}

interface YTNamespace {
  Player: new (
    el: HTMLIFrameElement,
    opts: { events: { onStateChange?: (e: YTPlayerEvent) => void; onError?: (e: YTPlayerEvent) => void } },
  ) => unknown;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("Could not load the YouTube player API"));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}
