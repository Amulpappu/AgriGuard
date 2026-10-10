/**
 * Stale-while-revalidate data hook.
 *
 * - Renders the last known value instantly (in-memory cache across client
 *   navigations, sessionStorage across reloads) instead of a blocking spinner.
 * - Revalidates in the background on mount, on window focus and on an optional
 *   interval; fresh data replaces the old value in one render (no flicker).
 * - On network failure the last good value is kept and `error` is set, so the
 *   UI never falls back to a blank screen.
 */
"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const STORAGE_PREFIX = "agq_cache:";
const memoryCache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function readStored<T>(key: string): T | undefined {
  if (memoryCache.has(key)) return memoryCache.get(key) as T;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (raw != null) {
      const parsed = JSON.parse(raw) as T;
      memoryCache.set(key, parsed);
      return parsed;
    }
  } catch {}
  return undefined;
}

function writeStored<T>(key: string, value: T) {
  memoryCache.set(key, value);
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {}
}

/** Drop cached entries whose key starts with `prefix` (or all entries when empty). */
export function invalidateCached(prefix: string = "") {
  Array.from(memoryCache.keys()).forEach((k) => {
    if (!prefix || k.startsWith(prefix)) memoryCache.delete(k);
  });
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k && (!prefix ? k.startsWith(STORAGE_PREFIX) : k.startsWith(STORAGE_PREFIX + prefix))) {
        sessionStorage.removeItem(k);
      }
    }
  } catch {}
}

export interface CachedQuery<T> {
  data: T | undefined;
  error: unknown;
  /** True only when there is nothing to show yet (first ever load). */
  isLoading: boolean;
  /** True while a background refresh is running. */
  isValidating: boolean;
  refresh: () => Promise<void>;
}

export function useCachedQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  opts: { refreshInterval?: number } = {},
): CachedQuery<T> {
  // Memory cache is safe to read during render: it is empty on the first
  // (hydrated) page load, and only populated for later client navigations.
  const [data, setData] = useState<T | undefined>(() =>
    key && memoryCache.has(key) ? (memoryCache.get(key) as T) : undefined,
  );
  const [error, setError] = useState<unknown>(null);
  const [isValidating, setIsValidating] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Hydrate from sessionStorage before paint so a reload shows cached data.
  useIsoLayoutEffect(() => {
    if (!key) return;
    const cached = readStored<T>(key);
    setData(cached);
  }, [key]);

  const refresh = useCallback(async () => {
    if (!key) return;
    setIsValidating(true);
    try {
      let p = inflight.get(key) as Promise<T> | undefined;
      if (!p) {
        p = fetcherRef.current();
        inflight.set(key, p);
      }
      const fresh = await p;
      writeStored(key, fresh);
      setData(fresh);
      setError(null);
    } catch (err) {
      setError(err ?? new Error("Request failed"));
    } finally {
      inflight.delete(key);
      setIsValidating(false);
    }
  }, [key]);

  useEffect(() => {
    if (!key) return;
    refresh();
    const onFocus = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onFocus);
    const id = opts.refreshInterval ? setInterval(onFocus, opts.refreshInterval) : undefined;
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      if (id) clearInterval(id);
    };
  }, [key, refresh, opts.refreshInterval]);

  return { data, error, isLoading: data === undefined && !error, isValidating, refresh };
}
