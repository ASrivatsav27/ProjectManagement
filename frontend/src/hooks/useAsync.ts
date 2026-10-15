import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/api/client";

interface Options {
  /** Skip fetching while false (e.g. waiting for another value). */
  enabled?: boolean;
  /** Keep showing the previous result while the next one loads (good for pagination). */
  keepPrevious?: boolean;
  /** Silently refetch on this interval while the tab is visible ("live" updates). */
  pollMs?: number;
  /** Return false to skip a poll tick (e.g. while a drag-and-drop update is in flight). */
  shouldPoll?: () => boolean;
}

interface State<T> {
  key: string;
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

const toApiError = (error: unknown) => (error instanceof ApiError ? error : new ApiError(0, "Something went wrong"));
const isAbort = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

/**
 * Generic data-fetching hook. Re-runs whenever `deps` change, cancels stale requests,
 * and exposes `reload`, `setData` (for optimistic updates) and an error object.
 */
export function useAsync<T>(fetcher: (signal: AbortSignal) => Promise<T>, deps: readonly (string | number | boolean | null | undefined)[], options: Options = {}) {
  const { enabled = true, keepPrevious = false, pollMs, shouldPoll } = options;
  const key = deps.join("|");
  const [state, setState] = useState<State<T>>({ key, data: null, error: null, loading: enabled });
  const [tick, setTick] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const shouldPollRef = useRef(shouldPoll);
  shouldPollRef.current = shouldPoll;

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    const controller = new AbortController();
    setState((s) => ({ key, data: keepPrevious || s.key === key ? s.data : null, error: null, loading: true }));

    fetcherRef
      .current(controller.signal)
      .then((data) => setState({ key, data, error: null, loading: false }))
      .catch((error) => {
        if (!isAbort(error)) setState((s) => ({ key, data: keepPrevious || s.key === key ? s.data : null, error: toApiError(error), loading: false }));
      });

    return () => controller.abort();
  }, [key, tick, enabled, keepPrevious]);

  useEffect(() => {
    if (!enabled || !pollMs) return;

    let controller: AbortController | null = null;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || shouldPollRef.current?.() === false) return;

      controller?.abort();
      controller = new AbortController();
      fetcherRef
        .current(controller.signal)
        .then((data) => setState((s) => (s.key === key ? { key, data, error: null, loading: false } : s)))
        .catch(() => {
          /* a failed background refresh should not replace good data with an error */
        });
    }, pollMs);

    return () => {
      window.clearInterval(timer);
      controller?.abort();
    };
  }, [key, enabled, pollMs]);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  const setData = useCallback((update: (previous: T) => T) => {
    setState((s) => (s.data === null ? s : { ...s, data: update(s.data) }));
  }, []);

  const current = state.key === key || keepPrevious;

  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: state.key !== key ? enabled : state.loading,
    reload,
    setData,
  };
}
