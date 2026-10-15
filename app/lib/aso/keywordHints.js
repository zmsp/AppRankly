const https = require('https');
let gplay = require('google-play-scraper');
if (gplay && gplay.default) {
  gplay = gplay.default;
}

const APPLE_STOREFRONTS = {
  us: '143441-1,29',
  gb: '143444-1,29',
  uk: '143444-1,29',
  de: '143443-1,29',
  fr: '143442-1,29',
  jp: '143462-1,29',
  ca: '143455-1,29',
  au: '143460-1,29',
  it: '143450-1,29',
  es: '143454-1,29',
  br: '143503-1,29',
  in: '143467-1,29',
  kr: '143466-1,29',
  cn: '143465-1,29'
};

function fetchAppleHints(term, country = 'us') {
  if (!term || typeof term !== 'string' || !term.trim()) {
    return Promise.resolve([]);
  }
  const cleanTerm = term.trim();
  const sf = APPLE_STOREFRONTS[country.toLowerCase()] || APPLE_STOREFRONTS.us;

  return new Promise((resolve) => {
    const url = 'https://search.itunes.apple.com/WebObjects/MZSearchHints.woa/wa/hints?clientApplication=Software&term=' + encodeURIComponent(cleanTerm);
    const req = https.get(url, {
      headers: {
        'User-Agent': 'iTunes/12.11.3 (Windows; Microsoft Windows 10 x64)',
        'X-Apple-Store-Front': sf
      },
      timeout: 4500
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const terms = [];
        const regex = /<key>term<\/key>\s*<string>([^<]+)<\/string>/g;
        let match;
        while ((match = regex.exec(data)) !== null) {
          const val = match[1].trim();
          if (val && !terms.includes(val)) {
            terms.push(val);
          }
        }
        resolve(terms);
      });
    });

    req.on('error', () => resolve([]));
    req.on('timeout', () => {
      req.destroy();
      resolve([]);
    });
  });
}

async function fetchGoogleHints(term, country = 'us', lang = 'en') {
  if (!term || typeof term !== 'string' || !term.trim()) {
    return [];
  }
  const cleanTerm = term.trim();
  try {
    if (gplay && typeof gplay.suggest === 'function') {
      const results = await gplay.suggest({ term: cleanTerm, country: country.toLowerCase(), lang });
      return Array.isArray(results) ? results.map(s => String(s).trim()).filter(Boolean) : [];
    }
  } catch (err) {
    // Graceful fallback on network or country error
  }
  return [];
}

async function getKeywordHints({ term, platform = 'all', country = 'us', expand = false }) {
  if (!term || !term.trim()) {
    return { term: '', total: 0, keywords: [], tree: {} };
  }

  const cleanTerm = term.trim().toLowerCase();
  const c = (country || 'us').toLowerCase();
  const plat = (platform || 'all').toLowerCase();

  const includeApple = plat === 'all' || plat === 'apple' || plat === 'ios';
  const includeGoogle = plat === 'all' || plat === 'play' || plat === 'google' || plat === 'android';

  const [appleResults, googleResults] = await Promise.all([
    includeApple ? fetchAppleHints(cleanTerm, c) : Promise.resolve([]),
    includeGoogle ? fetchGoogleHints(cleanTerm, c) : Promise.resolve([])
  ]);

  const map = new Map();

  appleResults.forEach((t, idx) => {
    const key = t.toLowerCase();
    const score = Math.max(20, 100 - (idx * 8));
    map.set(key, {
      term: t,
      platforms: ['apple'],
      appleRank: idx + 1,
      googleRank: null,
      score: score
    });
  });

  googleResults.forEach((t, idx) => {
    const key = t.toLowerCase();
    const gScore = Math.max(20, 100 - (idx * 8));
    if (map.has(key)) {
      const item = map.get(key);
      item.platforms.push('play');
      item.googleRank = idx + 1;
      item.score = Math.min(100, Math.round((item.score + gScore) / 1.6));
    } else {
      map.set(key, {
        term: t,
        platforms: ['play'],
        appleRank: null,
        googleRank: idx + 1,
        score: gScore
      });
    }
  });

  let keywords = Array.from(map.values()).sort((a, b) => b.score - a.score);

  // Calculate metadata for each keyword
  keywords = keywords.map(item => {
    const words = item.term.split(/\s+/).filter(Boolean);
    return {
      ...item,
      wordCount: words.length,
      charCount: item.term.length,
      isLongTail: words.length >= 3
    };
  });

  const tree = {
    root: cleanTerm,
    children: {}
  };

  // If expand requested, query top 3 suggestions to generate branch hints
  if (expand && keywords.length > 0) {
    const topKeywords = keywords.slice(0, 3).map(k => k.term);
    await Promise.all(topKeywords.map(async subTerm => {
      const subApple = includeApple ? await fetchAppleHints(subTerm, c) : [];
      const subGoogle = includeGoogle ? await fetchGoogleHints(subTerm, c) : [];
      const combinedSubs = Array.from(new Set([...subApple, ...subGoogle]))
        .filter(t => t.toLowerCase() !== subTerm.toLowerCase() && t.toLowerCase() !== cleanTerm)
        .slice(0, 5);

      tree.children[subTerm] = combinedSubs;
    }));
  }

  return {
    term: cleanTerm,
    country: c,
    platform: plat,
    total: keywords.length,
    keywords,
    tree
  };
}

module.exports = {
  fetchAppleHints,
  fetchGoogleHints,
  getKeywordHints,
  APPLE_STOREFRONTS
};
