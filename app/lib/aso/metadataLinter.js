/**
 * Pre-Flight Store Policy & Metadata Linter
 * Validates Apple App Store & Google Play metadata rules and limits before submission.
 */

// Common banned/risky marketing claims per Apple Guideline 2.3.7 & Google Play Metadata Policy
const BANNED_CLAIM_PATTERNS = [
  { pattern: /(?:^|\s|[^\w])#1(?:\s|$|[^\w])/i, name: 'Unverified ranking claim ("#1")', severity: 'error' },
  { pattern: /\bnumber\s*(one|1)\b/i, name: 'Unverified ranking claim ("number one")', severity: 'error' },
  { pattern: /\b(best|top)\s+(app|game|tool|tracker)\b/i, name: 'Superlative claim ("best/top app")', severity: 'error' },
  { pattern: /\b(100%|guaranteed)\b/i, name: 'Absolute guarantee claim', severity: 'warning' },
  { pattern: /\b(free|sale|discount|deal|cheap|price|\$|€|£)\b/i, name: 'Pricing/promotional incentive claim in title/subtitle', severity: 'error' },
  { pattern: /\b(download\s+now|install\s+now|tap\s+here)\b/i, name: 'Call-to-action incentive', severity: 'warning' }
];

const PROHIBITED_TITLE_CHARS = /[!?:;*~=^<>«»""'']/g;
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function getUtf8ByteLength(str) {
  if (!str) return 0;
  return Buffer.byteLength(str, 'utf8');
}

function lintMetadata({ platform = 'apple', title = '', subtitle = '', shortDescription = '', keywords = '', description = '', promoText = '' }) {
  const isApple = String(platform).toLowerCase() === 'apple' || String(platform).toLowerCase() === 'ios';
  const errors = [];
  const warnings = [];
  const stats = {};
  const fixes = {};

  const cleanTitle = (title || '').trim();
  const cleanSubtitle = (subtitle || '').trim();
  const cleanShortDesc = (shortDescription || '').trim();
  const cleanKeywords = (keywords || '').trim();
  const cleanDesc = (description || '').trim();
  const cleanPromo = (promoText || '').trim();

  // 1. Apple App Store Specific Checks
  if (isApple) {
    stats.title = { charCount: cleanTitle.length, max: 30, byteCount: getUtf8ByteLength(cleanTitle) };
    stats.subtitle = { charCount: cleanSubtitle.length, max: 30, byteCount: getUtf8ByteLength(cleanSubtitle) };
    stats.keywords = { byteCount: getUtf8ByteLength(cleanKeywords), maxBytes: 100, charCount: cleanKeywords.length };
    stats.description = { charCount: cleanDesc.length, max: 4000 };
    stats.promoText = { charCount: cleanPromo.length, max: 170 };

    // Title limit
    if (cleanTitle.length > 30) {
      errors.push({ field: 'title', message: `Title exceeds 30 characters (${cleanTitle.length}/30).` });
    }
    // Subtitle limit
    if (cleanSubtitle.length > 30) {
      errors.push({ field: 'subtitle', message: `Subtitle exceeds 30 characters (${cleanSubtitle.length}/30).` });
    }
    // Promotional text limit
    if (cleanPromo.length > 170) {
      errors.push({ field: 'promoText', message: `Promotional text exceeds 170 characters (${cleanPromo.length}/170).` });
    }
    // Description limit
    if (cleanDesc.length > 4000) {
      errors.push({ field: 'description', message: `Description exceeds 4000 characters (${cleanDesc.length}/4000).` });
    }

    // Apple Keyword Field validation (100 BYTE limit!)
    const kwBytes = stats.keywords.byteCount;
    if (kwBytes > 100) {
      errors.push({ field: 'keywords', message: `Keywords exceed strict Apple 100-byte limit (${kwBytes}/100 bytes).` });
    }

    if (cleanKeywords) {
      // Check spaces after commas
      if (cleanKeywords.includes(', ')) {
        warnings.push({
          field: 'keywords',
          message: 'Keywords contain spaces after commas (e.g. "a, b"). Removing spaces saves precious bytes in your 100-byte budget.'
        });
        fixes.keywords = cleanKeywords.split(',').map(s => s.trim()).filter(Boolean).join(',');
      }

      // Check duplicates between keywords and title/subtitle
      const titleWords = (cleanTitle + ' ' + cleanSubtitle)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/gi, ' ')
        .split(/\s+/)
        .filter(w => w.length > 1);

      const parsedKws = cleanKeywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
      const duplicateWithTitle = [];
      const seenSet = new Set();
      const internalDuplicates = [];

      parsedKws.forEach(kw => {
        if (seenSet.has(kw)) {
          internalDuplicates.push(kw);
        }
        seenSet.add(kw);

        if (titleWords.includes(kw)) {
          duplicateWithTitle.push(kw);
        }
      });

      if (duplicateWithTitle.length > 0) {
        warnings.push({
          field: 'keywords',
          message: `Keywords contain words already in Title/Subtitle: [${duplicateWithTitle.join(', ')}]. Apple automatically indexes Title and Subtitle; repeating them in keywords wastes budget.`
        });
      }

      if (internalDuplicates.length > 0) {
        warnings.push({
          field: 'keywords',
          message: `Keywords contain duplicate terms: [${internalDuplicates.join(', ')}].`
        });
      }

      // Special characters in keywords
      const badKwChars = cleanKeywords.match(/[@#$%^&*()_+=\[\]{};:"\\|<>?~`]/g);
      if (badKwChars) {
        warnings.push({
          field: 'keywords',
          message: `Keywords contain invalid special characters (${Array.from(new Set(badKwChars)).join(' ')}). Use comma-separated single words.`
        });
      }
    }
  } else {
    // 2. Google Play Specific Checks
    stats.title = { charCount: cleanTitle.length, max: 30 };
    stats.shortDescription = { charCount: cleanShortDesc.length, max: 80 };
    stats.description = { charCount: cleanDesc.length, max: 4000 };

    if (cleanTitle.length > 30) {
      errors.push({ field: 'title', message: `Google Play Title exceeds 30 characters (${cleanTitle.length}/30).` });
    }
    if (cleanShortDesc.length > 80) {
      errors.push({ field: 'shortDescription', message: `Short description exceeds 80 characters (${cleanShortDesc.length}/80).` });
    }
    if (cleanDesc.length > 4000) {
      errors.push({ field: 'description', message: `Full description exceeds 4000 characters (${cleanDesc.length}/4000).` });
    }

    // Google Play Title Emoji prohibition
    if (EMOJI_REGEX.test(cleanTitle)) {
      errors.push({ field: 'title', message: 'Google Play policy strictly prohibits emojis in the app title.' });
    }
  }

  // 3. Universal Policy & Claim Checks (Applied to Title, Subtitle, Short Description)
  const headerText = `${cleanTitle} ${cleanSubtitle} ${cleanShortDesc}`;

  BANNED_CLAIM_PATTERNS.forEach(item => {
    if (item.pattern.test(headerText)) {
      const targetList = item.severity === 'error' ? errors : warnings;
      targetList.push({
        field: 'policy',
        message: `Policy violation: ${item.name} detected. Risk of store review rejection.`
      });
    }
  });

  // ALL CAPS shouty words check (e.g. "THE BEST APP EVER")
  const allCapsWords = cleanTitle.split(/\s+/).filter(w => w.length > 3 && w === w.toUpperCase() && /^[A-Z]+$/.test(w));
  if (allCapsWords.length > 1) {
    warnings.push({
      field: 'title',
      message: `Title contains ALL CAPS shouty words [${allCapsWords.join(', ')}]. App Store reviewers frequently flag excessive capitalization.`
    });
  }

  // Punctuation spam in title
  const exclamationMatches = cleanTitle.match(/!+/g);
  if (exclamationMatches && exclamationMatches.some(m => m.length > 1 || exclamationMatches.length > 1)) {
    warnings.push({
      field: 'title',
      message: 'Title contains multiple or repetitive exclamation points.'
    });
  }

  // Calculate Quality Score (0 to 100)
  let score = 100;
  score -= errors.length * 25;
  score -= warnings.length * 8;
  score = Math.max(0, Math.min(100, score));

  return {
    valid: errors.length === 0,
    platform: isApple ? 'apple' : 'play',
    score,
    stats,
    errors,
    warnings,
    fixes
  };
}

module.exports = {
  lintMetadata,
  getUtf8ByteLength,
  BANNED_CLAIM_PATTERNS
};
