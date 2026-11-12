import { useEffect, useState } from "react";
import { Eye, EyeOff, ExternalLink, KeyRound, Music2, Trash2, X } from "lucide-react";
import type { Settings } from "../types";
import { Switch } from "./Switch";

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
  onClearData: (what: "history" | "saved" | "queue" | "searches" | "tiktok") => void;
  toast: (msg: string) => void;
}

export function SettingsModal({ settings, onChange, onClose, onClearData, toast }: Props) {
  const [draft, setDraft] = useState(settings.apiKey);
  const [reveal, setReveal] = useState(false);
  const [ttDraft, setTtDraft] = useState(settings.tiktokKey);
  const [ttReveal, setTtReveal] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const saveKey = () => {
    const key = draft.trim();
    onChange({ ...settings, apiKey: key });
    toast(key ? "API key saved" : "API key removed");
    if (key) onClose();
  };

  const saveTtKey = () => {
    const key = ttDraft.trim();
    onChange({ ...settings, tiktokKey: key });
    toast(key ? "TikTok key saved" : "TikTok key removed");
    if (key) onClose();
  };

  const section = "rounded-2xl border border-white/8 bg-white/3 p-5";
  const ghost =
    "inline-flex items-center gap-2 rounded-lg bg-white/8 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-red-500/15 hover:text-red-200";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="animate-pop-in max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-white/10 bg-panel p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="settings-title" className="font-display text-xl font-semibold text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* API key */}
          <section className={section}>
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold/15 text-gold">
                <KeyRound className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white">Backup search key</h3>
                <p className="text-xs text-zinc-500">Optional · only useful if searches ever fail</p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              Search works out of the box with no setup. If the built-in search is ever unavailable, a free YouTube Data
              API key gives you Google's official search as a dependable backup.
            </p>

            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-400 marker:text-zinc-600">
              <li>
                Open the{" "}
                <a
                  className="inline-flex items-center gap-1 text-gold underline underline-offset-4"
                  href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  YouTube Data API v3 page <ExternalLink className="h-3 w-3" />
                </a>{" "}
                and click <strong className="font-medium text-zinc-200">Enable</strong>.
              </li>
              <li>
                Go to <strong className="font-medium text-zinc-200">Credentials → Create credentials → API key</strong>.
              </li>
              <li>Paste the key below.</li>
            </ol>

            <div className="mt-4 flex gap-2">
              <div className="flex min-w-0 flex-1 items-center rounded-xl border border-white/10 bg-ink/70 focus-within:border-ember/60 focus-within:ring-4 focus-within:ring-ember/15">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveKey()}
                  type={reveal ? "text" : "password"}
                  placeholder="AIza…"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="YouTube Data API key"
                  className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setReveal((r) => !r)}
                  className="mr-1 grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:text-white"
                  aria-label={reveal ? "Hide key" : "Show key"}
                >
                  {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                onClick={saveKey}
                className="bg-gradient-ember shrink-0 rounded-xl px-5 text-sm font-semibold text-ink hover:brightness-110"
              >
                Save
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              Your key stays in this browser and is only ever sent to Google. Playback itself never needs a key.
            </p>
          </section>

          {/* TikTok search key */}
          <section className={section}>
            <div className="flex items-center gap-3">
              <span className="bg-gradient-tt grid h-9 w-9 place-items-center rounded-lg text-white">
                <Music2 className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white">TikTok keyword search</h3>
                <p className="text-xs text-zinc-500">Optional · pasting links and opening creators needs no key</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              TikTok has no public search a website can call on its own. With a TikWM API key, searching by keyword and
              listing a creator's videos work inside Lumen.{" "}
              <a
                className="inline-flex items-center gap-1 text-gold underline underline-offset-4"
                href="https://tikwmapi.com"
                target="_blank"
                rel="noreferrer"
              >
                Get a key <ExternalLink className="h-3 w-3" />
              </a>
            </p>
            <div className="mt-4 flex gap-2">
              <div className="flex min-w-0 flex-1 items-center rounded-xl border border-white/10 bg-ink/70 focus-within:border-ember/60 focus-within:ring-4 focus-within:ring-ember/15">
                <input
                  value={ttDraft}
                  onChange={(e) => setTtDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveTtKey()}
                  type={ttReveal ? "text" : "password"}
                  placeholder="Paste your TikWM API key"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="TikTok API key"
                  className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setTtReveal((r) => !r)}
                  className="mr-1 grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:text-white"
                  aria-label={ttReveal ? "Hide TikTok key" : "Show TikTok key"}
                >
                  {ttReveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                onClick={saveTtKey}
                className="bg-gradient-tt shrink-0 rounded-xl px-5 text-sm font-semibold text-white hover:brightness-110"
                aria-label="Save TikTok key"
              >
                Save
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              Your key stays in this browser and is only ever sent to api.tikwmapi.com.
            </p>
          </section>

          {/* Playback */}
          <section className={section}>
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-semibold text-white">Autoplay next video</span>
                <span className="block text-xs text-zinc-500">
                  When a video ends, play the next one in your queue or list.
                </span>
              </span>
              <Switch
                checked={settings.autoplay}
                onChange={(v) => onChange({ ...settings, autoplay: v })}
                label="Autoplay next video"
              />
            </label>
          </section>

          {/* Data */}
          <section className={section}>
            <h3 className="text-sm font-semibold text-white">Your data</h3>
            <p className="mt-1 text-xs text-zinc-500">Saved videos, history, queue and recent searches live only in this browser.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={ghost} onClick={() => onClearData("history")}>
                <Trash2 className="h-3.5 w-3.5" /> Clear history
              </button>
              <button className={ghost} onClick={() => onClearData("saved")}>
                <Trash2 className="h-3.5 w-3.5" /> Clear saved
              </button>
              <button className={ghost} onClick={() => onClearData("queue")}>
                <Trash2 className="h-3.5 w-3.5" /> Clear queue
              </button>
              <button className={ghost} onClick={() => onClearData("searches")}>
                <Trash2 className="h-3.5 w-3.5" /> Clear searches
              </button>
              <button className={ghost} onClick={() => onClearData("tiktok")}>
                <Trash2 className="h-3.5 w-3.5" /> Clear TikTok history
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
