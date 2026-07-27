const storeRules = {
  play: {
    title: 30,
    short_description: 80,
    description: 4000
  },
  apple: {
    title: 30,
    subtitle: 30,
    keyword_field: 100,
    promotional_text: 170
  }
};

/**
 * Validate metadata fields against store length limits
 */
function validateMetadata(field, text, platform = 'play') {
  const normPlat = (platform === 'apple' || platform === 'ios') ? 'apple' : 'play';
  const store = storeRules[normPlat] || storeRules.play;
  const maxLimit = store[field] || 255;
  const length = (text || '').length;
  const isValid = length <= maxLimit;

  return {
    field,
    length,
    maxLimit,
    isValid,
    overBy: Math.max(0, length - maxLimit)
  };
}

/**
 * Compute coverage of keywords across indexed store listing fields
 */
function simulateCoverage(trackedKeywords, metadata = {}, platform = 'play') {
  const keywords = Array.isArray(trackedKeywords) ? trackedKeywords : [];
  const results = [];

  const titleText = (metadata.title || '').toLowerCase();
  const shortDescText = (metadata.short_description || metadata.subtitle || '').toLowerCase();
  const longDescText = (metadata.description || '').toLowerCase();
  const keywordFieldText = (metadata.keyword_field || '').toLowerCase();
  const isPlay = platform === 'play' || platform === 'google' || platform === 'android';

  for (const item of keywords) {
    const term = (typeof item === 'string' ? item : item.term || '').toLowerCase().trim();
    if (!term) continue;

    let isTitleCovered = titleText.includes(term);
    let isSubCovered = shortDescText.includes(term);
    let isDescCovered = longDescText.includes(term);
    let isKwFieldCovered = keywordFieldText.split(',').map(s => s.trim()).includes(term);

    let status = 'none';
    if (isPlay) {
      if (isTitleCovered) status = 'exact_title';
      else if (isSubCovered) status = 'exact_short';
      else if (isDescCovered) status = 'exact_desc';
    } else {
      // Apple rules
      if (isTitleCovered) status = 'exact_title';
      else if (isSubCovered) status = 'exact_subtitle';
      else if (isKwFieldCovered) status = 'exact_keyword_field';
    }

    results.push({
      term,
      status,
      coveredIn: {
        title: isTitleCovered,
        shortDescOrSubtitle: isSubCovered,
        description: isDescCovered,
        keywordField: isKwFieldCovered
      }
    });
  }

  const coveredCount = results.filter(r => r.status !== 'none').length;
  const score = keywords.length > 0 ? Math.round((coveredCount / keywords.length) * 100) : 0;

  return {
    totalKeywords: keywords.length,
    coveredKeywords: coveredCount,
    coverageScorePct: score,
    details: results
  };
}

module.exports = {
  storeRules,
  validateMetadata,
  simulateCoverage
};
