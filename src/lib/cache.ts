import { unstable_cache } from "next/cache";

/**
 * Thin wrapper around Next.js unstable_cache.
 * Replaces the broken Redis implementation.
 * Works on Vercel without any external Redis service.
 */
export function createCachedFn<T>(
  fn: () => Promise<T>,
  keys: string[],
  options: { revalidate?: number; tags?: string[] } = {},
): () => Promise<T> {
  return unstable_cache(fn, keys, {
    revalidate: options.revalidate ?? 300,
    tags: options.tags,
  });
}

// Legacy shim — keeps pages that call getCache/setCache from crashing.
// They simply become no-ops; the real caching is done via createCachedFn
// or the `use cache` directive on page functions directly.
const memCache = new Map<string, { value: unknown; expiresAt: number }>();

export async function setCache(key: string, value: unknown, ttlSeconds = 300) {
  memCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function getCache<T>(key: string): Promise<T | null> {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memCache.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function delCache(key: string) {
  memCache.delete(key);
}
