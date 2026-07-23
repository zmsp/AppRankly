const axios = require('axios');
const gplay = require('google-play-scraper');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Detailed Google Play listing fetch
 */
async function getPlayListing(appId) {
  try {
    const raw = await gplay.app({ appId });
    if (!raw) return null;

    return {
      appId: raw.appId,
      title: raw.title || '',
      summary: raw.summary || raw.shortDescription || '',
      description: raw.description || '',
      developer: raw.developer || raw.developerId || '',
      category: raw.genre || raw.genreId || '',
      icon: raw.icon || '',
      headerImage: raw.headerImage || '',
      screenshots: raw.screenshots || [],
      score: raw.score || 0,
      ratings: raw.ratings || 0,
      reviews: raw.reviews || 0,
      installs: raw.installs || '',
      minInstalls: raw.minInstalls || 0,
      priceText: raw.priceText || (raw.free ? 'Free' : '$' + raw.price),
      contentRating: raw.contentRating || '',
      updated: raw.updated ? new Date(raw.updated).toISOString() : new Date().toISOString(),
      version: raw.version || '',
      recentChanges: raw.recentChanges || ''
    };
  } catch (err) {
    console.warn(`[ASO Scraper] Play listing fetch failed for ${appId}:`, err.message);
    return null;
  }
}

async function getPlaySuggest(term, country = 'us', lang = 'en') {
  try {
    return await gplay.suggest({ term, country, lang });
  } catch (err) {
    console.warn(`[ASO Scraper] Play suggest failed for term "${term}":`, err.message);
    return [];
  }
}

async function getPlaySearch(term, num = 30, country = 'us', lang = 'en') {
  try {
    return await gplay.search({ term, num, country, lang });
  } catch (err) {
    console.warn(`[ASO Scraper] Play search failed for term "${term}":`, err.message);
    return [];
  }
}

async function getPlaySimilar(appId) {
  try {
    const list = await gplay.similar({ appId });
    return (list || []).map(raw => ({
      appId: raw.appId,
      title: raw.title || '',
      summary: raw.summary || '',
      developer: raw.developer || '',
      score: raw.score || 0,
      icon: raw.icon || '',
      priceText: raw.priceText || (raw.free ? 'Free' : ''),
      installs: raw.installs || ''
    }));
  } catch (err) {
    console.warn(`[ASO Scraper] Play similar failed for ${appId}:`, err.message);
    return [];
  }
}

async function getPlayReviews(appId, num = 100, country = 'us') {
  try {
    const res = await gplay.reviews({ appId, num, country, sort: gplay.sort.NEWEST });
    return res.data || [];
  } catch (err) {
    console.warn(`[ASO Scraper] Play reviews failed for ${appId}:`, err.message);
    return [];
  }
}

/**
 * Detailed iTunes Search & Lookup API wrappers
 */
async function getAppleSearch(term, country = 'us', limit = 30) {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&country=${country}&limit=${limit}`;
    const resp = await axios.get(url, { timeout: 10000 });
    return (resp.data?.results || []).map(formatAppleRawData);
  } catch (err) {
    console.warn(`[ASO Scraper] Apple search failed for term "${term}":`, err.message);
    return [];
  }
}

async function getAppleLookup(trackId) {
  try {
    const url = `https://itunes.apple.com/lookup?id=${trackId}`;
    const resp = await axios.get(url, { timeout: 10000 });
    const raw = resp.data?.results?.[0];
    return raw ? formatAppleRawData(raw) : null;
  } catch (err) {
    console.warn(`[ASO Scraper] Apple lookup failed for ID ${trackId}:`, err.message);
    return null;
  }
}

function formatAppleRawData(raw) {
  return {
    trackId: raw.trackId,
    bundleId: raw.bundleId,
    trackName: raw.trackName || '',
    subtitle: raw.subtitle || '',
    description: raw.description || '',
    developer: raw.artistName || raw.sellerName || '',
    category: raw.primaryGenreName || '',
    icon: raw.artworkUrl100 || raw.artworkUrl512 || raw.artworkUrl60 || '',
    screenshots: raw.screenshotUrls || [],
    score: raw.averageUserRating || 0,
    ratings: raw.userRatingCount || 0,
    priceText: raw.formattedPrice || (raw.price === 0 ? 'Free' : '$' + raw.price),
    contentRating: raw.trackContentRating || '',
    version: raw.version || '',
    releaseNotes: raw.releaseNotes || '',
    updated: raw.currentVersionReleaseDate || raw.releaseDate || new Date().toISOString()
  };
}

async function getAppleReviewsRSS(trackId, country = 'us') {
  try {
    const url = `https://itunes.apple.com/${country}/rss/customerreviews/id=${trackId}/sortBy=mostRecent/json`;
    const resp = await axios.get(url, { timeout: 10000 });
    const entries = resp.data?.feed?.entry || [];
    const reviews = [];
    for (const e of entries) {
      if (e['im:name']) continue;
      reviews.push({
        id: e.id?.label || `apple_${Date.now()}_${Math.random()}`,
        author: e.author?.name?.label || 'Anonymous',
        title: e.title?.label || '',
        body: e.content?.label || '',
        rating: parseInt(e['im:rating']?.label || '5', 10),
        version: e['im:version']?.label || '',
        reviewDate: new Date().toISOString()
      });
    }
    return reviews;
  } catch (err) {
    console.warn(`[ASO Scraper] Apple RSS reviews failed for ${trackId}:`, err.message);
    return [];
  }
}

/**
 * Expand keywords using autocomplete fan-out (a-z mining)
 */
async function expandKeywordsAutocomplete(seeds, store = 'play', country = 'us', lang = 'en') {
  const discovered = new Set();
  const seedList = Array.isArray(seeds) ? seeds : [seeds];

  for (const seed of seedList) {
    if (!seed || !seed.trim()) continue;
    const baseSuggestions = store === 'play' 
      ? await getPlaySuggest(seed, country, lang)
      : (await getAppleSearch(seed, country, 10)).map(item => item.trackName);

    baseSuggestions.forEach(s => discovered.add(s.toLowerCase().trim()));
    await sleep(200);

    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    for (const char of alphabet) {
      const query = `${seed} ${char}`;
      if (store === 'play') {
        const list = await getPlaySuggest(query, country, lang);
        list.forEach(s => discovered.add(s.toLowerCase().trim()));
      }
      await sleep(150);
    }
  }

  return Array.from(discovered);
}

module.exports = {
  getPlayListing,
  getPlaySuggest,
  getPlaySearch,
  getPlaySimilar,
  getPlayReviews,
  getAppleSearch,
  getAppleLookup,
  getAppleReviewsRSS,
  expandKeywordsAutocomplete
};
