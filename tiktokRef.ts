/**
 * Understanding what someone pasted into the TikTok box. Pure functions with no
 * imports, so the router, the API layer and the main search box can all share them.
 */

export const TT_ID_RE = /^\d{15,22}$/;
const HANDLE_RE = /^[\p{L}\p{N}._]{2,40}$/u;

export type TikTokRef =
  | { kind: "video"; id: string; user?: string }
  | { kind: "creator"; user: string }
  /** vm.tiktok.com/… and tiktok.com/t/… — these only resolve on TikTok's servers. */
  | { kind: "short" };

export const isTikTokHandle = (s: string) => HANDLE_RE.test(s);

export const looksLikeTikTok = (s: string) => /(^|[/.@])tiktok\.com/i.test(s);

function dec(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Recognises a TikTok video link (any common shape), a bare video id, a creator
 * profile link, and — when `bareHandle` is on — a plain `@username`.
 * Keywords and non-TikTok links return null.
 */
export function parseTikTokInput(input: string, opts: { bareHandle?: boolean } = {}): TikTokRef | null {
  const s = input.trim();
  if (!s) return null;

  if (TT_ID_RE.test(s)) return { kind: "video", id: s };

  if (s.startsWith("@")) {
    if (!opts.bareHandle || /\s/.test(s)) return null;
    const user = s.slice(1);
    return HANDLE_RE.test(user) ? { kind: "creator", user } : null;
  }

  if (/\s/.test(s)) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!/(^|\.)tiktok\.com$/.test(host)) return null;
  const sub = host.replace(/\.?tiktok\.com$/, ""); // "", "www", "m", "vm", "vt"

  const parts = url.pathname.split("/").filter(Boolean).map(dec);
  if (sub === "vm" || sub === "vt") return parts.length ? { kind: "short" } : null;

  const [a, b, c] = parts;
  if (!a) return null;

  if (a === "t") return b ? { kind: "short" } : null;

  if (a.startsWith("@")) {
    const user = a.slice(1);
    if (!HANDLE_RE.test(user)) return null;
    if ((b === "video" || b === "photo") && c && TT_ID_RE.test(c)) return { kind: "video", id: c, user };
    return { kind: "creator", user };
  }

  if (a === "embed") {
    if (b === "v2" && c && TT_ID_RE.test(c)) return { kind: "video", id: c };
    if (b && TT_ID_RE.test(b)) return { kind: "video", id: b };
    if (b?.startsWith("@") && HANDLE_RE.test(b.slice(1))) return { kind: "creator", user: b.slice(1) };
    return null;
  }

  if (a === "player" && b === "v1" && c && TT_ID_RE.test(c)) return { kind: "video", id: c };
  if (a === "video" && b && TT_ID_RE.test(b)) return { kind: "video", id: b };
  if (a === "v" && b) {
    const id = b.replace(/\.html$/i, "");
    if (TT_ID_RE.test(id)) return { kind: "video", id };
  }

  return null;
}
