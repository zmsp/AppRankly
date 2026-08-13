const path = require("path");
const fs = require("fs");
const axios = require("axios");
const gplayModule = require("google-play-scraper");
const gplay = gplayModule.default || gplayModule;
const resolver = require("./resolver");
const { DATA_DIR } = require("./config");

const PLAYSTORE_CACHE_FILE = path.join(DATA_DIR, "playstore_scrape_cache.json");
const APPSTORE_CACHE_FILE = path.join(DATA_DIR, "appstore_scrape_cache.json");

const getScrapedAppleStoreData = async (identifier) => {
  if (!identifier) return null;
  return resolver.resolve('scrape:apple', { identifier }, async () => {
    let cache = {};
    try {
      if (fs.existsSync(APPSTORE_CACHE_FILE)) {
        cache = JSON.parse(fs.readFileSync(APPSTORE_CACHE_FILE, "utf8"));
        if (cache[identifier]?.data) {
          return cache[identifier].data;
        }
      }
    } catch (e) {}

    try {
      const isNumeric = /^\d+$/.test(identifier);
      const url = isNumeric
        ? `https://itunes.apple.com/lookup?id=${identifier}`
        : `https://itunes.apple.com/lookup?bundleId=${identifier}`;

      const res = await axios.get(url);
      if (res.data && res.data.results && res.data.results.length > 0) {
        const item = res.data.results[0];
        const scraped = {
          title: item.trackName,
          iconUrl: item.artworkUrl512 || item.artworkUrl100 || item.artworkUrl60,
          summary: item.description ? item.description.substring(0, 200) + '...' : '',
          descriptionHTML: item.description,
          scoreText: item.averageUserRating ? item.averageUserRating.toFixed(1) : 'N/A',
          score: item.averageUserRating || 0,
          ratings: item.userRatingCount || 0,
          reviews: item.userRatingCount || 0,
          installs: 'N/A',
          minInstalls: 0,
          genre: item.primaryGenreName,
          developer: item.sellerName || item.artistName,
          developerId: item.artistId,
          developerWebsite: item.sellerUrl,
          priceText: item.formattedPrice || (item.price === 0 ? 'Free' : `$${item.price}`),
          free: item.price === 0,
          version: item.version,
          updated: item.currentVersionReleaseDate || item.releaseDate,
          url: item.trackViewUrl,
          adamId: item.trackId,
          bundleId: item.bundleId
        };
        cache[identifier] = { timestamp: Date.now(), data: scraped };
        try { fs.writeFileSync(APPSTORE_CACHE_FILE, JSON.stringify(cache, null, 2)); } catch {}
        return scraped;
      }
    } catch (err) {
      console.error(`Could not scrape App Store metadata for ${identifier}:`, err.message);
    }
    return null;
  });
};

const getScrapedPlayStoreData = async (appId) => {
  if (!appId) return null;
  return resolver.resolve('scrape:google', { appId }, async () => {
    let cache = {};
    try {
      if (fs.existsSync(PLAYSTORE_CACHE_FILE)) {
        cache = JSON.parse(fs.readFileSync(PLAYSTORE_CACHE_FILE, "utf8"));
        if (cache[appId]?.data) {
          return cache[appId].data;
        }
      }
    } catch (e) {}

    try {
      const data = await gplay.app({ appId });
      const scraped = {
        title: data.title,
        iconUrl: data.icon,
        summary: data.summary,
        descriptionHTML: data.descriptionHTML || data.description,
        scoreText: data.scoreText,
        score: data.score,
        ratings: data.ratings,
        reviews: data.reviews,
        installs: data.installs,
        minInstalls: data.minInstalls,
        genre: data.genre,
        developer: data.developer,
        developerId: data.developerId,
        developerEmail: data.developerEmail,
        developerWebsite: data.developerWebsite,
        priceText: data.priceText,
        free: data.free,
        version: data.version,
        updated: data.updated,
        url: data.url
      };
      cache[appId] = { timestamp: Date.now(), data: scraped };
      try { fs.writeFileSync(PLAYSTORE_CACHE_FILE, JSON.stringify(cache, null, 2)); } catch {}
      return scraped;
    } catch (err) {
      console.warn(`Could not scrape Play Store metadata for ${appId}:`, err.message);
      return null;
    }
  });
};

module.exports = {
  getScrapedAppleStoreData,
  getScrapedPlayStoreData,
  APPSTORE_CACHE_FILE,
  PLAYSTORE_CACHE_FILE
};
