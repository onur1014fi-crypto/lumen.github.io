import { useCallback, useEffect, useState } from "react";
import type { Route, TikTokView } from "../types";
import { isRouteRef } from "./channelRef";
import { isTikTokHandle, TT_ID_RE } from "./tiktokRef";
import { isVideoId } from "./youtube";

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function parseTikTokPath(rest: string[]): TikTokView {
  const [a, b, c] = rest.map(safeDecode);

  if (a === "search") {
    const q = safeDecode(rest.slice(1).join("/")).trim();
    return q ? { kind: "search", q } : { kind: "home" };
  }
  if (a === "video" && b && TT_ID_RE.test(b)) {
    const user = c?.replace(/^@/, "");
    return { kind: "video", id: b, user: user && isTikTokHandle(user) ? user : undefined };
  }
  if (a?.startsWith("@") && isTikTokHandle(a.slice(1))) return { kind: "creator", user: a.slice(1) };
  return { kind: "home" };
}

function tiktokHash(v: TikTokView): string {
  switch (v.kind) {
    case "search":
      return `#/tiktok/search/${encodeURIComponent(v.q)}`;
    case "video":
      return `#/tiktok/video/${v.id}${v.user ? `/@${encodeURIComponent(v.user)}` : ""}`;
    case "creator":
      return `#/tiktok/@${encodeURIComponent(v.user)}`;
    default:
      return "#/tiktok";
  }
}

/** Tiny hash router so the back button and shareable links just work. */
export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  const [head, ...rest] = path.split("/");

  if (head === "watch" && isVideoId(rest[0] ?? "")) return { name: "watch", id: rest[0] };
  if (head === "search") {
    const q = safeDecode(rest.join("/")).trim();
    return q ? { name: "search", q } : { name: "home" };
  }
  if (head === "saved") return { name: "saved" };
  if (head === "history") return { name: "history" };
  if (head === "following") return { name: "following" };
  if (head === "tiktok") return { name: "tiktok", view: parseTikTokPath(rest) };
  if (head === "channel") {
    const ref = safeDecode(rest.join("/"));
    return isRouteRef(ref) ? { name: "channel", ref } : { name: "following" };
  }
  return { name: "home" };
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case "watch":
      return `#/watch/${route.id}`;
    case "search":
      return `#/search/${encodeURIComponent(route.q)}`;
    case "saved":
      return "#/saved";
    case "history":
      return "#/history";
    case "following":
      return "#/following";
    case "tiktok":
      return tiktokHash(route.view);
    case "channel":
      return route.ref.startsWith("@")
        ? `#/channel/@${encodeURIComponent(route.ref.slice(1))}`
        : `#/channel/${route.ref}`;
    default:
      return "#/";
  }
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  /** `replace` swaps the current history entry instead of adding one (used for Previous/Next). */
  const navigate = useCallback((next: Route, opts?: { replace?: boolean }) => {
    const hash = routeToHash(next);
    if (window.location.hash === hash) {
      setRoute(next);
      window.scrollTo({ top: 0 });
    } else if (opts?.replace) {
      window.location.replace(hash);
    } else {
      window.location.hash = hash;
    }
  }, []);

  return [route, navigate] as const;
}
