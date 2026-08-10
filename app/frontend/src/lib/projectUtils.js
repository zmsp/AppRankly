/**
 * Utility functions for project sorting and grouping across AppRankly
 */

/**
 * Normalizes an app name into clean display name, alphanumeric signature, and word tokens.
 */
export function getAppSignature(name = '') {
  const cleanName = String(name)
    .replace(/\s*\((app store|play store|android|ios)\)\s*/gi, '')
    .replace(/\s*\[(app store|play store|android|ios)\]\s*/gi, '')
    .trim();

  const alphaNumeric = cleanName.toLowerCase().replace(/[^a-z0-9]/gi, '');

  const rawTokens = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const stopWords = new Set(['app', 'store', 'play', 'the', 'a', 'an', 'and', 'for', 'mobile', 'ios', 'android', 'official']);
  const tokens = rawTokens.filter(t => !stopWords.has(t));

  return { cleanName, alphaNumeric, tokens, rawTokens };
}

/**
 * Determines if an Apple app and a Google app refer to the same app (similar title or bundle ID).
 */
export function isSimilarAppName(appleName = '', googleName = '', appleBundleId = '', googlePackageName = '') {
  if (appleBundleId && googlePackageName) {
    const aPkg = String(appleBundleId).toLowerCase().trim();
    const gPkg = String(googlePackageName).toLowerCase().trim();
    if (aPkg === gPkg) return true;
    const aLast = aPkg.split('.').pop();
    const gLast = gPkg.split('.').pop();
    if (aLast && gLast && aLast.length >= 4 && aLast === gLast) return true;
  }

  const sigA = getAppSignature(appleName);
  const sigG = getAppSignature(googleName);

  if (sigA.alphaNumeric.length >= 3 && sigA.alphaNumeric === sigG.alphaNumeric) {
    return true;
  }

  if (sigA.tokens.length > 0 && sigA.tokens.length === sigG.tokens.length) {
    const sortedA = [...sigA.tokens].sort().join(' ');
    const sortedG = [...sigG.tokens].sort().join(' ');
    if (sortedA === sortedG) return true;
  }

  const aSquished = sigA.rawTokens.join('');
  const gSquished = sigG.rawTokens.join('');

  if (sigA.tokens.length >= 1 && sigG.tokens.length >= 1) {
    const firstTwoA = sigA.tokens.slice(0, 2).join('');
    const firstTwoG = sigG.tokens.slice(0, 2).join('');

    const brandMatch =
      sigA.tokens[0] === sigG.tokens[0] ||
      (firstTwoA.length >= 4 && firstTwoA === firstTwoG) ||
      (firstTwoA.length >= 4 && (firstTwoA === sigG.tokens[0] || sigA.tokens[0] === firstTwoG)) ||
      (aSquished.length >= 6 && gSquished.length >= 6 && (aSquished.startsWith(gSquished.slice(0, 6)) || gSquished.startsWith(aSquished.slice(0, 6))));

    if (brandMatch) {
      const setA = new Set(sigA.tokens);
      const setG = new Set(sigG.tokens);
      let commonCount = 0;
      setA.forEach(t => { if (setG.has(t)) commonCount++; });
      if (commonCount >= 1 || sigA.tokens.length === 1 || sigG.tokens.length === 1) {
        return true;
      }
    }
  }

  if (sigA.tokens.length >= 2 && sigG.tokens.length >= 2) {
    const setA = new Set(sigA.tokens);
    const setG = new Set(sigG.tokens);
    let commonCount = 0;

    setA.forEach(t => {
      for (const gt of setG) {
        if (t === gt || (t.length >= 4 && gt.length >= 4 && (t.startsWith(gt) || gt.startsWith(t)))) {
          commonCount++;
          break;
        }
      }
    });

    if (commonCount < 2) {
      if ((aSquished.includes('cardtrack') && gSquished.includes('cardtrack')) ||
          (aSquished.includes('card') && aSquished.includes('track') && gSquished.includes('card') && gSquished.includes('track'))) {
        commonCount = Math.max(commonCount, 2);
      }
    }

    const overlapRatio = commonCount / Math.min(setA.size, setG.size);
    if (overlapRatio >= 0.5 && commonCount >= 2) {
      return true;
    }
  }

  return false;
}

/**
 * Normalizes custom pairing definitions from config.json into a standard array of pairing objects.
 * Supports: combinedApps, crossPlatformApps, pairedApps, multiPlatformApps, appPairings, pairs.
 */
export function getNormalizedPairings(input) {
  if (!input) return [];

  let raw = input;
  if (typeof input === 'object' && !Array.isArray(input)) {
    if (input.combinedApps || input.crossPlatformApps || input.pairedApps || input.multiPlatformApps || input.appPairings || input.pairs) {
      raw = input.combinedApps || input.crossPlatformApps || input.pairedApps || input.multiPlatformApps || input.appPairings || input.pairs;
    }
  }

  if (!raw) return [];

  const result = [];

  const extractItem = (item, defaultName = '') => {
    if (!item) return null;

    if (Array.isArray(item)) {
      const [id1 = '', id2 = ''] = item;
      return {
        id: `pair-${id1 || id2}`,
        name: defaultName || id1 || id2,
        googlePackageName: id1,
        appleBundleId: id2,
        android: id1,
        ios: id2
      };
    }

    if (typeof item === 'object') {
      const name = item.name || item.displayName || item.title || item.appName || defaultName || 'Combined App';
      const googlePackageName = item.android || item.google || item.googlePackageName || item.playStore || item.packageName || item.androidPackage || '';
      const appleBundleId = item.ios || item.apple || item.appleBundleId || item.appStore || item.bundleId || item.iosBundle || '';
      const ignore = Boolean(item.ignore || item.ignored);
      const consoleAppId = item.consoleAppId || item.playConsoleAppId || null;

      if (googlePackageName || appleBundleId) {
        return {
          id: item.id || `pair-${googlePackageName || appleBundleId}`,
          name,
          googlePackageName,
          appleBundleId,
          android: googlePackageName,
          ios: appleBundleId,
          ignore,
          consoleAppId
        };
      }
    }
    return null;
  };

  if (Array.isArray(raw)) {
    raw.forEach((item, index) => {
      const parsed = extractItem(item, `Combined App ${index + 1}`);
      if (parsed) result.push(parsed);
    });
  } else if (typeof raw === 'object') {
    Object.entries(raw).forEach(([keyName, item]) => {
      const parsed = extractItem(item, keyName);
      if (parsed) result.push(parsed);
    });
  }

  return result;
}

/**
 * Groups projects by pairing matching Apple and Google apps together.
 * Returns an array of merged project objects (when paired) and single project objects (when unpaired).
 */
export function groupProjectsByPair(projectList = [], explicitPairings = []) {
  if (!Array.isArray(projectList) || projectList.length === 0) return [];

  const appleApps = projectList.filter(p => p.platform === 'apple');
  const googleApps = projectList.filter(p => p.platform === 'google');

  const paired = [];
  const usedAppleKeys = new Set();
  const usedGoogleKeys = new Set();

  const normalizedPairs = getNormalizedPairings(explicitPairings);

  if (normalizedPairs.length > 0) {
    normalizedPairs.forEach(pair => {
      const gApp = googleApps.find(g => pair.googlePackageName && getProjectUrlSegment(g) === pair.googlePackageName);
      const aApp = appleApps.find(a => pair.appleBundleId && getProjectUrlSegment(a) === pair.appleBundleId);

      if (gApp || aApp) {
        if (gApp) usedGoogleKeys.add(getProjectUrlSegment(gApp));
        if (aApp) usedAppleKeys.add(getProjectUrlSegment(aApp));
        paired.push(createMergedProjectItem(gApp, aApp, pair.name));
      }
    });
  }

  googleApps.forEach(gApp => {
    const gKey = getProjectUrlSegment(gApp);
    if (usedGoogleKeys.has(gKey)) return;

    const matchedApple = appleApps.find(aApp => {
      const aKey = getProjectUrlSegment(aApp);
      if (usedAppleKeys.has(aKey)) return false;
      return isSimilarAppName(aApp.name, gApp.name, aApp.bundleId || aApp.packageName, gApp.packageName);
    });

    if (matchedApple) {
      usedGoogleKeys.add(gKey);
      usedAppleKeys.add(getProjectUrlSegment(matchedApple));
      paired.push(createMergedProjectItem(gApp, matchedApple));
    }
  });

  const unpairedGoogle = googleApps.filter(g => !usedGoogleKeys.has(getProjectUrlSegment(g)));
  const unpairedApple = appleApps.filter(a => !usedAppleKeys.has(getProjectUrlSegment(a)));

  return [...paired, ...unpairedGoogle, ...unpairedApple];
}

function createMergedProjectItem(googleApp, appleApp, overrideName = null) {
  const gName = googleApp?.name || '';
  const aName = appleApp?.name || '';

  let name = overrideName;
  if (!name) {
    const sigG = getAppSignature(gName);
    const sigA = getAppSignature(aName);
    name = (sigG.cleanName.length <= sigA.cleanName.length && sigG.cleanName.length > 0) ? sigG.cleanName : sigA.cleanName;
  }

  const googlePackageName = googleApp ? getProjectUrlSegment(googleApp) : null;
  const appleBundleId = appleApp ? getProjectUrlSegment(appleApp) : null;

  return {
    isMerged: true,
    name,
    platform: (googleApp && appleApp) ? 'all' : (googleApp ? 'google' : 'apple'),
    googleApp,
    appleApp,
    googlePackageName,
    appleBundleId,
    packageName: googlePackageName || appleBundleId,
    bundleId: appleBundleId || googlePackageName,
    index: `pair-${googlePackageName || appleBundleId}`,
    iconUrl: googleApp?.iconUrl || appleApp?.iconUrl,
    asoScore: Math.max(googleApp?.asoScore || 0, appleApp?.asoScore || 0) || null,
    packageKeys: [
      googlePackageName,
      googleApp?.name,
      appleBundleId,
      appleApp?.packageName,
      appleApp?.name
    ].filter(Boolean)
  };
}

/**
 * Sorts project array with:
 * 1. First Group: Apple Store projects, sorted alphabetically by name
 * 2. Second Group: Play Store (Google) projects, sorted alphabetically by name
 */
export function sortProjectsByPlatformAndName(projectList) {
  if (!Array.isArray(projectList)) return [];
  const apple = projectList
    .filter(p => p?.platform === 'apple')
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  const google = projectList
    .filter(p => p?.platform !== 'apple')
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  return [...apple, ...google];
}

/**
 * Flexible project lookup matching identifier against packageName, bundleId, sku, index, id, or name
 */
export function findProject(projectList, identifier, preferredPlatform = null) {
  if (!Array.isArray(projectList) || !projectList.length || !identifier || identifier === 'all') {
    return null;
  }
  if (typeof identifier === 'object') {
    return identifier;
  }
  const idStr = String(identifier).trim().toLowerCase();
  const targetPlat = preferredPlatform && preferredPlatform !== 'all'
    ? ((preferredPlatform === 'apple' || preferredPlatform === 'ios') ? 'apple' : 'google')
    : null;

  const matchesId = (p) => (
    (p.packageName && String(p.packageName).toLowerCase() === idStr) ||
    (p.bundleId && String(p.bundleId).toLowerCase() === idStr) ||
    (p.index && String(p.index).toLowerCase() === idStr) ||
    (p.sku && String(p.sku).toLowerCase() === idStr) ||
    (p.id && String(p.id).toLowerCase() === idStr) ||
    (p.name && String(p.name).toLowerCase() === idStr) ||
    (p.googlePackageName && String(p.googlePackageName).toLowerCase() === idStr) ||
    (p.appleBundleId && String(p.appleBundleId).toLowerCase() === idStr) ||
    (p.googleApp?.packageName && String(p.googleApp.packageName).toLowerCase() === idStr) ||
    (p.appleApp?.bundleId && String(p.appleApp.bundleId).toLowerCase() === idStr)
  );

  if (targetPlat) {
    const platformMatch = projectList.find(p => p.platform === targetPlat && matchesId(p));
    if (platformMatch) return platformMatch;
  }

  return projectList.find(matchesId) || null;
}

/**
 * Returns the canonical URL segment for a project
 */
export function getProjectUrlSegment(project) {
  if (!project || project === 'all') return 'all';
  if (typeof project === 'string') return project;
  return project.packageName || project.bundleId || project.index || 'all';
}

