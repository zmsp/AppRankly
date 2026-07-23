/**
 * Simple in-memory cache for API stats responses.
 * Keys are built from request params so the same query always hits cache.
 * Cache entries expire after TTL_MS (default 5 minutes).
 */

const TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache = new Map();

/**
 * Build a deterministic cache key from request params.
 */
export function buildCacheKey(params) {
  // Sort keys so order doesn't matter
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .sort(([a], [b]) => a.localeCompare(b))
    )
  );
}

/**
 * Get a cached value. Returns `undefined` if missing or expired.
 */
export function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

/**
 * Store a value in cache under the given key.
 */
export function setCached(key, value) {
  cache.set(key, { value, timestamp: Date.now() });
}

/**
 * Invalidate all cache entries (e.g. when user changes config).
 */
export function clearCache() {
  cache.clear();
}

/**
 * Invalidate entries matching a prefix / partial key string.
 */
export function invalidateCacheByPartialKey(partial) {
  for (const key of cache.keys()) {
    if (key.includes(partial)) {
      cache.delete(key);
    }
  }
}
