import { ExternalLink, Info, KeyRound } from "lucide-react";
import type { TikTokVideo } from "../types";
import { creatorEmbedSrc, profileUrl, tikTokUserPosts } from "../lib/tiktok";
import { TikTokFeed } from "./TikTokFeed";

interface Props {
  user: string;
  apiKey: string;
  onPlay: (video: TikTokVideo, list: TikTokVideo[], label: string) => void;
  onOpenSettings: () => void;
}

/**
 * A creator's page. With an API key their videos are listed here and play in-page.
 * Without one, TikTok's own creator embed shows their latest videos instead.
 */
export function TikTokCreatorView({ user, apiKey, onPlay, onOpenSettings }: Props) {
  return (
    <div>
      <div className="animate-fade-up mb-8 flex flex-wrap items-center gap-4">
        <span className="bg-gradient-tt grid h-16 w-16 shrink-0 place-items-center rounded-full font-display text-2xl font-bold text-white shadow-lg shadow-black/40">
          {user.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-semibold tracking-tight text-white">@{user}</h1>
          <p className="text-sm text-zinc-500">TikTok creator</p>
        </div>
        <a
          href={profileUrl(user)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/15 hover:text-white"
        >
          <ExternalLink className="h-4 w-4" /> Open on TikTok
        </a>
      </div>

      {apiKey ? (
        <TikTokFeed
          key={`u:${user}`}
          cacheKey={`u:${user.toLowerCase()}:${apiKey.slice(-6)}`}
          load={(cursor) => tikTokUserPosts(user, apiKey, cursor)}
          label={`@${user}`}
          onPlay={onPlay}
          onOpenSettings={onOpenSettings}
          emptyTitle="No videos found"
          emptyBody={`Nothing came back for @${user}. Check the spelling, or the account may be private.`}
        />
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,540px)_minmax(0,1fr)]">
          <div className="animate-fade-up overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 shadow-black/50 ring-white/10">
            <iframe
              title={`@${user} on TikTok`}
              src={creatorEmbedSrc(user)}
              loading="lazy"
              className="block h-[560px] w-full"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>

          <div className="space-y-4 lg:pt-2">
            <div className="flex gap-3 rounded-2xl border border-white/8 bg-panel/70 p-4 text-sm leading-relaxed text-zinc-400">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
              <p>
                This is TikTok's own creator card. Tapping a thumbnail opens TikTok. To watch a specific video here
                in Lumen, copy its link and paste it into the box above.
              </p>
            </div>
            <div className="flex gap-3 rounded-2xl border border-white/8 bg-panel/70 p-4">
              <span className="bg-gradient-tt grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white">
                <KeyRound className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">Want every video listed here?</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  Add a TikTok API key in Settings and @{user}'s videos load as a grid that plays inside Lumen.
                </p>
                <button
                  onClick={onOpenSettings}
                  className="mt-3 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                >
                  Add API key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
