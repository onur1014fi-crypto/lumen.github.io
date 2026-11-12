import type { Channel, ChannelDetails, VideoMeta } from "../types";
import { CHANNEL_ID_RE } from "./channelRef";
import { getJson, mapPipedItem, viaPiped, type PipedItem } from "./search";
import { remember } from "./store";
import { fetchOEmbed } from "./youtube";

/* ------------------------------------------------------------------ */
/* Channels: look up, and walk through every upload                    */
/*                                                                     */
/* Everything here lives in memory for the current visit only — nothing */
/* about followed channels or their videos is written to storage, so   */
/* the section starts fresh every time Lumen is opened.                */
/* ------------------------------------------------------------------ */

export type TabKey = "videos" | "shorts" | "live";

/** Where to pick up the next page of a feed. Pinned to the instance that issued it. */
export interface ChannelNext {
  token: string;
  base: string;
}

export interface Feed {
  videos: VideoMeta[];
  next?: ChannelNext;
  done: boolean;
  /** Whether the first page has been fetched. */
  started: boolean;
}

const TIMEOUT = 10_000;
/** Pages that come back empty-but-not-finished are skipped over, up to this many in a row. */
const MAX_EMPTY_HOPS = 4;

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
export const sameName = (a: string, b: string) => !!a && !!b && norm(a) === norm(b);

export function formatSubs(n?: number) {
  if (n == null || n < 0) return "";
  return `${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n)} subscribers`;
}

/* ---------------- finding channels ---------------- */

interface PipedChannelItem {
  url?: string;
  type?: string;
  name?: string;
  thumbnail?: string;
  description?: string;
  subscribers?: number;
  verified?: boolean;
}

const idFromUrl = (url?: string) => /\/channel\/(UC[\w-]{22})/.exec(url ?? "")?.[1];
const knownSubs = (n?: number) => (typeof n === "number" && n >= 0 ? n : undefined);

/** Keyword search over channels (also how `@handle`s are resolved). */
export async function searchChannels(q: string): Promise<Channel[]> {
  let sawEmpty = false;
  try {
    const { value } = await viaPiped(async (base, signal) => {
      const data = await getJson<{ items?: PipedChannelItem[] }>(
        `${base}/search?q=${encodeURIComponent(q)}&filter=channels`,
        TIMEOUT,
        signal,
      );
      if (!data || !Array.isArray(data.items)) throw new Error("unexpected response");
      // A blocked instance often answers 200 with nothing — let another confirm.
      if (data.items.length === 0) {
        sawEmpty = true;
        throw new Error("empty");
      }
      return data.items;
    });
    const seen = new Set<string>();
    const out: Channel[] = [];
    for (const i of value) {
      const id = idFromUrl(i.url);
      if (i.type !== "channel" || !id || !i.name || seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        name: i.name,
        avatar: i.thumbnail || undefined,
        subscribers: knownSubs(i.subscribers),
        verified: !!i.verified,
        description: i.description || undefined,
      });
    }
    return out;
  } catch {
    if (sawEmpty) return [];
    throw new Error("Couldn't reach YouTube's search right now. Check your connection and try again.");
  }
}

/* ---------------- channel details (+ the first page of videos) ---------------- */

interface PipedChannel {
  id?: string;
  name?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  description?: string;
  nextpage?: string | null;
  subscriberCount?: number;
  verified?: boolean;
  relatedStreams?: PipedItem[];
  tabs?: { name?: string; data?: string }[];
}

const feeds = new Map<string, Feed>();
const inflight = new Map<string, Promise<void>>();
const details = new Map<string, Promise<ChannelDetails>>();
const handles = new Map<string, string>();

export const feedKey = (id: string, tab: TabKey) => `${id}|${tab}`;

export function getFeed(id: string, tab: TabKey): Feed {
  return feeds.get(feedKey(id, tab)) ?? { videos: [], done: false, started: false };
}

/** Maps raw items and stamps them with the channel they belong to, so lists can never be mixed up. */
function toVideos(items: PipedItem[] | undefined, channel: Pick<Channel, "id" | "name">): VideoMeta[] {
  const seen = new Set<string>();
  const out: VideoMeta[] = [];
  for (const raw of items ?? []) {
    const v = mapPipedItem(raw);
    if (!v || seen.has(v.id)) continue;
    seen.add(v.id);
    out.push({ ...v, channel: channel.name, channelId: channel.id });
  }
  return out;
}

/**
 * Decides whether a page from one instance can be believed.
 *
 * Some community instances are degraded: they serve empty pages that still advance the
 * continuation token (silently skipping ~30 videos each), and at the true end of a channel
 * they return an empty page with no continuation, which looks exactly like a genuine end.
 * So an empty page is never taken at face value. If it claims there is more, it's rejected;
 * if it claims to be the end, a second, different instance has to agree before it counts.
 * A rejected attempt leaves the cursor where it was, so nothing is ever skipped.
 */
function makePageJudge() {
  const confirmedEmptyEnd = new Set<string>();
  return (base: string, count: number, hasNext: boolean) => {
    if (count > 0) return true;
    if (hasNext) return false;
    confirmedEmptyEnd.add(base);
    return confirmedEmptyEnd.size >= 2;
  };
}

function loadDetails(id: string): Promise<ChannelDetails> {
  const cached = details.get(id);
  if (cached) return cached;

  const p = (async () => {
    const trusted = makePageJudge();
    const { base, value } = await viaPiped(async (b, signal) => {
      const data = await getJson<PipedChannel>(`${b}/channel/${id}`, TIMEOUT, signal);
      if (!data?.id || !data.name) throw new Error("unexpected response");
      if (!trusted(b, data.relatedStreams?.length ?? 0, !!data.nextpage)) throw new Error("untrusted empty page");
      return data;
    });

    const channel: ChannelDetails = {
      id: value.id!,
      name: value.name!,
      avatar: value.avatarUrl || undefined,
      banner: value.bannerUrl || undefined,
      description: value.description || undefined,
      subscribers: knownSubs(value.subscriberCount),
      verified: !!value.verified,
      tabs: {
        shorts: value.tabs?.find((t) => t.name === "shorts")?.data || undefined,
        live: value.tabs?.find((t) => t.name === "livestreams")?.data || undefined,
      },
    };

    const videos = toVideos(value.relatedStreams, channel);
    remember(videos);
    feeds.set(feedKey(channel.id, "videos"), {
      videos,
      next: value.nextpage ? { token: value.nextpage, base } : undefined,
      done: !value.nextpage,
      started: true,
    });
    return channel;
  })();

  details.set(id, p);
  p.catch(() => details.delete(id)); // let a later attempt try again
  return p;
}

/**
 * Turns `UC…` or `@handle` into full channel details. When a handle is given,
 * `nameHint` (e.g. from a video's oEmbed data) picks the right account if
 * several channels have similar names.
 */
export async function resolveChannel(ref: string, nameHint?: string): Promise<ChannelDetails> {
  if (CHANNEL_ID_RE.test(ref)) return loadDetails(ref);

  const cacheKey = `${ref.toLowerCase()}|${nameHint ?? ""}`;
  const known = handles.get(cacheKey);
  if (known) return loadDetails(known);

  const handle = ref.replace(/^@/, "");
  const results = await searchChannels(`@${handle}`);
  const hit =
    (nameHint ? results.find((r) => sameName(r.name, nameHint)) : undefined) ??
    results.find((r) => sameName(r.name, handle)) ??
    results[0];
  if (!hit) throw new Error("Channel not found");
  handles.set(cacheKey, hit.id);
  return loadDetails(hit.id);
}

/** Works out which channel posted a video, using whatever we already know before asking oEmbed. */
export async function channelRefForVideo(video: VideoMeta): Promise<{ ref: string; hint?: string } | null> {
  if (video.channelId) return { ref: video.channelId };
  let handle = video.channelHandle;
  let name = video.channel;
  if (!handle) {
    const meta = await fetchOEmbed(video.id);
    if (meta?.channelId) return { ref: meta.channelId };
    handle = meta?.channelHandle;
    name = meta?.channel || name;
  }
  return handle ? { ref: handle, hint: name || undefined } : null;
}

/* ---------------- walking through a channel's uploads ---------------- */

interface FeedPage {
  relatedStreams?: PipedItem[];
  content?: PipedItem[];
  nextpage?: string | null;
}

async function fetchFeedPage(channel: ChannelDetails, tab: TabKey, feed: Feed) {
  const tabToken = tab === "shorts" ? channel.tabs.shorts : tab === "live" ? channel.tabs.live : undefined;
  const cursor = feed.next;
  const trusted = makePageJudge();

  const { base, value } = await viaPiped(async (b, signal) => {
    let url: string;
    if (tab === "videos") {
      if (!cursor) throw new Error("nothing more to load");
      url = `${b}/nextpage/channel/${channel.id}?nextpage=${encodeURIComponent(cursor.token)}`;
    } else {
      if (!tabToken) throw new Error("this channel has no such tab");
      url =
        `${b}/channels/tabs?data=${encodeURIComponent(tabToken)}` +
        (cursor ? `&nextpage=${encodeURIComponent(cursor.token)}` : "");
    }
    const data = await getJson<FeedPage>(url, TIMEOUT, signal);
    const items = data?.relatedStreams ?? data?.content;
    if (!data || !Array.isArray(items)) throw new Error("unexpected response");
    if (!trusted(b, items.length, !!data.nextpage)) throw new Error("untrusted empty page");
    return data;
  }, cursor?.base);

  return {
    videos: toVideos(value.relatedStreams ?? value.content, channel),
    next: value.nextpage ? { token: value.nextpage, base } : undefined,
  };
}

/** One page, with a single quick retry for transient hiccups. */
async function fetchFeedPageWithRetry(channel: ChannelDetails, tab: TabKey, feed: Feed) {
  try {
    return await fetchFeedPage(channel, tab, feed);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return fetchFeedPage(channel, tab, feed);
  }
}

/**
 * Fetches the next page of one channel's feed and appends it to that channel's
 * list (and only that list). Calls for the same feed are shared, never doubled.
 */
export function loadFeedPage(channel: ChannelDetails, tab: TabKey): Promise<void> {
  const key = feedKey(channel.id, tab);
  const running = inflight.get(key);
  if (running) return running;

  const p = (async () => {
    for (let hop = 0; hop < MAX_EMPTY_HOPS; hop++) {
      const feed = getFeed(channel.id, tab);
      if (feed.done) return;

      const page = await fetchFeedPageWithRetry(channel, tab, feed);
      const have = new Set(feed.videos.map((v) => v.id));
      const fresh = page.videos.filter((v) => !have.has(v.id));
      remember(fresh);
      feeds.set(key, {
        videos: [...feed.videos, ...fresh],
        next: page.next,
        done: !page.next,
        started: true,
      });
      if (fresh.length > 0 || !page.next) return;
    }
  })().finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p;
}
