/**
 * In-memory cache for API stats responses.
 * Keys are normalized using makeKey to match backend signatures.
 * Includes in-flight deduplication (cachedFetch) to prevent parallel requests.
 * Cache entries expire after TTL_MS (default 5 minutes).
 */

const TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache = new Map();
const _inflight = new Map();

/**
 * Generates a deterministic cache key matching the backend format.
 * Format: v1:<resource>:<key1=val1>:<key2=val2>
 */
export function makeKey(resource, params = {}) {
  const sorted = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null)
    .sort()
    .map(k => `${k}=${String(params[k]).toLowerCase().trim()}`)
    .join(':');
  return sorted ? `v1:${resource}:${sorted}` : `v1:${resource}`;
}

/**
 * Build a deterministic cache key from request params.
 */
export function buildCacheKey(params) {
  return makeKey('stats', params);
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
 * Deduplicate in-flight requests and reuse cached values.
 */
export async function cachedFetch(key, fetchFn) {
  const cached = getCached(key);
  if (cached !== undefined) return cached;

  if (_inflight.has(key)) return _inflight.get(key);

  const promise = (async () => {
    try {
      const val = await fetchFn();
      setCached(key, val);
      return val;
    } finally {
      _inflight.delete(key);
    }
  })();

  _inflight.set(key, promise);
  return promise;
}

/**
 * Invalidate all cache entries.
 */
export function clearCache() {
  cache.clear();
  _inflight.clear();
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

