const _cache = new Map();

const TTL = {
  'gcs:auth':       600,      // 10 min — GCS auth tokens are valid for 1hr
  'gcs:filelist':   300,      // 5 min — bucket file listings
  'packages':       600,      // 10 min — listPackages results
  'scrape:google':  86400,    // 24h — Play Store metadata changes rarely
  'scrape:apple':   86400,    // 24h — App Store metadata
  'stats':          300,      // 5 min — overview/dimension stats
  'config':         60,       // 1 min — config.json rarely changes
  'projects':       600,      // 10 min — /api/projects list
};

/**
 * Generates a deterministic cache key for a given resource and parameter set.
 * Format: v1:<resource>:<key1=val1>:<key2=val2>
 */
function makeKey(resource, params = {}) {
  const sorted = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null)
    .sort()
    .map(k => `${k}=${String(params[k]).toLowerCase().trim()}`)
    .join(':');
  return sorted ? `v1:${resource}:${sorted}` : `v1:${resource}`;
}

/**
 * Retrieves a value from the in-memory cache if present and unexpired.
 */
function get(key, resource) {
  const entry = _cache.get(key);
  if (!entry) return undefined;
  
  const ttlSec = TTL[resource] || 300; // default 5 min
  const now = Date.now();
  if (now - entry.fetchedAt > ttlSec * 1000) {
    _cache.delete(key);
    return undefined;
  }
  return entry.value;
}

/**
 * Stores a value in the in-memory cache with the current timestamp.
 */
function set(key, value) {
  _cache.set(key, {
    value,
    fetchedAt: Date.now()
  });
}

/**
 * Invalidates cache entries matching exact key or prefix.
 */
function invalidate(keyOrPrefix) {
  if (!keyOrPrefix) {
    _cache.clear();
    return;
  }
  for (const key of _cache.keys()) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      _cache.delete(key);
    }
  }
}

/**
 * Returns summary metrics of current cache state.
 */
function stats() {
  return {
    size: _cache.size
  };
}

module.exports = {
  makeKey,
  get,
  set,
  invalidate,
  stats,
  TTL
};
