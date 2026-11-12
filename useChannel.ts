import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { ChannelDetails } from "../types";
import { getFeed, loadFeedPage, resolveChannel, type TabKey } from "./channels";

export type DetailsState =
  | { status: "loading" }
  | { status: "ready"; channel: ChannelDetails }
  | { status: "error" };

/** Resolves a `UC…` id or `@handle` into channel details. */
export function useChannelDetails(ref: string) {
  const [state, setState] = useState<DetailsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    resolveChannel(ref)
      .then((channel) => !cancelled && setState({ status: "ready", channel }))
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [ref, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}

/**
 * One channel's feed for one tab. The videos themselves live in the channels
 * module (keyed by channel + tab), so each feed stays separate from every other.
 */
export function useFeed(channel: ChannelDetails, tab: TabKey) {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const stopAll = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopAll.current = true;
    };
  }, []);

  const feed = getFeed(channel.id, tab);

  const loadMore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadFeedPage(channel, tab);
    } catch {
      if (alive.current) setError("Couldn't load more videos right now.");
    } finally {
      if (alive.current) {
        setLoading(false);
        bump();
      }
    }
  }, [channel, tab]);

  const loadAll = useCallback(async () => {
    stopAll.current = false;
    setLoadingAll(true);
    setError(null);
    try {
      while (!stopAll.current && !getFeed(channel.id, tab).done) {
        await loadFeedPage(channel, tab);
        if (alive.current) bump();
      }
    } catch {
      if (alive.current) setError("Stopped early — couldn't reach YouTube. Try again to keep loading.");
    } finally {
      if (alive.current) setLoadingAll(false);
    }
  }, [channel, tab]);

  const stop = useCallback(() => {
    stopAll.current = true;
  }, []);

  return { feed, loading, loadingAll, error, loadMore, loadAll, stop };
}
