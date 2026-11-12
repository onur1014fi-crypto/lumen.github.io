/**
 * Parsing for "which channel do you mean?" — pure functions with no imports,
 * so they can be shared by the link parser, oEmbed lookups and the router.
 */

export const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/;
const HANDLE_BODY = /^[\p{L}\p{N}._-]{3,60}$/u;

export type ChannelRef = { kind: "id"; id: string } | { kind: "handle"; handle: string };

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Understands every common way of naming a channel:
 * `@handle`, a bare `UC…` id, and youtube.com links of the form
 * /@handle, /channel/UC…, /c/name or /user/name (with or without /videos etc.).
 * Video links and plain keywords return null.
 */
export function parseChannelInput(input: string): ChannelRef | null {
  const s = input.trim();
  if (!s) return null;

  if (CHANNEL_ID_RE.test(s)) return { kind: "id", id: s };

  if (s.startsWith("@")) {
    if (/\s/.test(s)) return null;
    const h = s.slice(1);
    return HANDLE_BODY.test(h) ? { kind: "handle", handle: h } : null;
  }

  if (/\s/.test(s)) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  if (url.hostname.replace(/^(www|m|music)\./, "") !== "youtube.com") return null;

  const [a, b] = url.pathname.split("/").filter(Boolean).map(safeDecode);
  if (!a) return null;

  if (a.startsWith("@") && HANDLE_BODY.test(a.slice(1))) return { kind: "handle", handle: a.slice(1) };
  if (a === "channel" && b && CHANNEL_ID_RE.test(b)) return { kind: "id", id: b };
  if ((a === "c" || a === "user") && b && HANDLE_BODY.test(b)) return { kind: "handle", handle: b };
  return null;
}

/** The compact form used in routes and API calls: `UC…` or `@handle`. */
export function refToString(ref: ChannelRef): string {
  return ref.kind === "id" ? ref.id : `@${ref.handle}`;
}

/** Whether a string from the URL hash is a usable channel reference. */
export function isRouteRef(s: string): boolean {
  return CHANNEL_ID_RE.test(s) || (s.startsWith("@") && HANDLE_BODY.test(s.slice(1)));
}
