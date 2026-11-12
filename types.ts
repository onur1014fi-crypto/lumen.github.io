export interface VideoMeta {
  id: string;
  title: string;
  channel: string;
  /** The channel's `UC…` id, when known. */
  channelId?: string;
  /** The channel's `@handle`, when known (from oEmbed). */
  channelHandle?: string;
  duration?: string;
  published?: string;
  /** Relative text like "2 years ago", used when no exact date is known. */
  publishedText?: string;
  views?: number;
  live?: boolean;
  short?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  avatar?: string;
  subscribers?: number;
  verified?: boolean;
  description?: string;
}

export interface ChannelDetails extends Channel {
  banner?: string;
  /** Opaque tokens for the extra tabs this channel has (not every channel has both). */
  tabs: { shorts?: string; live?: string };
}

export interface TikTokVideo {
  /** The numeric id used in tiktok.com/@user/video/<id>. */
  id: string;
  /** The caption (may be empty). */
  title: string;
  /** The creator's handle without the @ (may be empty when unknown). */
  user: string;
  nickname?: string;
  avatar?: string;
  cover?: string;
  /** Seconds. */
  duration?: number;
  plays?: number;
  likes?: number;
  comments?: number;
  /** Unix seconds. */
  created?: number;
}

export type TikTokView =
  | { kind: "home" }
  | { kind: "search"; q: string }
  | { kind: "video"; id: string; user?: string }
  | { kind: "creator"; user: string };

export type Route =
  | { name: "home" }
  | { name: "watch"; id: string }
  | { name: "search"; q: string }
  | { name: "saved" }
  | { name: "history" }
  | { name: "following" }
  | { name: "channel"; ref: string }
  | { name: "tiktok"; view: TikTokView };

export interface Settings {
  apiKey: string;
  /** Key for TikTok keyword search (TikWM API). */
  tiktokKey: string;
  autoplay: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  tiktokKey: "",
  autoplay: true,
};

export interface Actions {
  /** `label` names the list being played from (e.g. a channel) and titles the "Up next" panel. */
  play: (video: VideoMeta, context?: VideoMeta[], label?: string) => void;
  toggleSave: (video: VideoMeta) => void;
  enqueue: (video: VideoMeta) => void;
  savedIds: Set<string>;
}
