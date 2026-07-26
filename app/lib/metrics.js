/**
 * Pure metric calculation functions, with no I/O or platform awareness.
 */

/**
 * Computes a simple moving average.
 * @param {number[]} series - Array of numerical values.
 * @param {number} window - The window size for the moving average.
 * @returns {number[]} - Array of the same length, with `null` for the warm-up period.
 */
function movingAverage(series, window) {
  if (!series || window <= 0) return series;
  return series.map((val, idx, arr) => {
    if (idx < window - 1) return null;
    const slice = arr.slice(idx - window + 1, idx + 1);
    const sum = slice.reduce((a, b) => a + (b || 0), 0);
    return sum / window;
  });
}

/**
 * Computes the rolling standard deviation.
 * @param {number[]} series 
 * @param {number} window 
 */
function rollingStdDev(series, window) {
  if (!series || window <= 0) return series;
  return series.map((val, idx, arr) => {
    if (idx < window - 1) return null;
    const slice = arr.slice(idx - window + 1, idx + 1);
    const mean = slice.reduce((a, b) => a + (b || 0), 0) / window;
    const variance = slice.reduce((a, b) => a + Math.pow((b || 0) - mean, 2), 0) / window;
    return Math.sqrt(variance);
  });
}

/**
 * Computes the percent change from previous to current.
 * @returns {number|null}
 */
function percentChange(current, previous) {
  if (previous === 0 || previous == null) return null;
  return (current - previous) / previous;
}

/**
 * Computes the churn rate (uninstalls / active devices).
 * @param {number} uninstalls 
 * @param {number} activeDevices 
 * @returns {number|null} 
 */
function churnRate(uninstalls, activeDevices) {
  if (!activeDevices || activeDevices === 0) return null;
  return uninstalls / activeDevices;
}

/**
 * Computes the install survival rate (active devices / total installs).
 * @param {number} activeDevices 
 * @param {number} totalInstalls 
 * @returns {number|null} 
 */
function installSurvival(activeDevices, totalInstalls) {
  if (!totalInstalls || totalInstalls === 0) return null;
  return activeDevices / totalInstalls;
}

/**
 * Computes average value per weekday.
 * @param {Array} trends - Array of objects with `date` (YYYY-MM-DD) and the specified field.
 * @param {string} field - The object property to average.
 * @returns {Object} { 0: avg_sun, 1: avg_mon, ... }
 */
function weekdayAverages(trends, field) {
  const sums = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  trends.forEach(trend => {
    const d = new Date(trend.date);
    if (isNaN(d)) return;
    const day = d.getUTCDay();
    if (trend[field] !== undefined && trend[field] !== null) {
      sums[day] += trend[field];
      counts[day]++;
    }
  });

  const avgs = {};
  for (let i = 0; i < 7; i++) {
    avgs[i] = counts[i] > 0 ? sums[i] / counts[i] : null;
  }
  return avgs;
}

/**
 * Detect anomalies using z-score.
 */
function zScoreAnomalies(series, window, k) {
  const ma = movingAverage(series, window);
  const std = rollingStdDev(series, window);
  
  return series.map((val, idx) => {
    if (ma[idx] === null || std[idx] === null || std[idx] === 0) return null;
    const z = (val - ma[idx]) / std[idx];
    return Math.abs(z) > k ? { index: idx, z } : null;
  }).filter(x => x !== null);
}

/**
 * Concentration Index
 */
function concentrationIndex(rows, field, topN = 3) {
  const sorted = [...rows].sort((a, b) => (b[field] || 0) - (a[field] || 0));
  const total = sorted.reduce((sum, row) => sum + (row[field] || 0), 0);
  if (total === 0) return null;
  
  const topShare = sorted.slice(0, topN).reduce((sum, row) => sum + (row[field] || 0), 0) / total;
  
  // HHI (Herfindahl-Hirschman Index)
  const hhi = sorted.reduce((sum, row) => {
    const share = (row[field] || 0) / total;
    return sum + (share * share);
  }, 0);

  return { topShare, hhi };
}

/**
 * Simple linear forecast using least squares.
 */
function linearForecast(series, horizonDays) {
  const n = series.length;
  if (n < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += series[i];
    sumXY += i * series[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const points = [];
  for (let i = 0; i < horizonDays; i++) {
    points.push(slope * (n + i) + intercept);
  }

  return { points, slope };
}

/**
 * Aggregates a list of overviews into a single overview.
 * Moved from generate_static_data.js and server.js.
 */
function aggregateOverviews(overviewsWithNames) {
  // If array is just overviews (from server.js) or objects with {name, overview} (from generate_static_data)
  // Normalize the input format
  const validOverviews = overviewsWithNames.filter(item => {
    if (item && item.overview) return true; // generate_static_data format
    if (item && item.totalInstallCountByUser !== undefined) return true; // server.js format
    return false;
  });

  if (validOverviews.length === 0) return null;

  const appTrendsMap = {};
  // Platform-specific totals for reliable breakdown display
  const platformTotals = {};
  
  const aggregated = validOverviews.reduce((acc, item) => {
    const isGenerateDataFormat = !!item.overview;
    const curr = isGenerateDataFormat ? item.overview : item;
    
    // Store app trends keyed by actual packageName (unique ID) to avoid display-name collisions
    const key = item.packageName || item.name;
    if (key) {
      appTrendsMap[key] = {
        trends: curr.dailyTrends || [],
        displayName: item.displayName || item.name || item.packageName,
        platform: curr.platform
      };
    }

    // Track per-platform install totals reliably
    const plat = curr.platform || 'unknown';
    if (!platformTotals[plat]) {
      platformTotals[plat] = { totalInstalls: 0, totalDailyUserInstalls: 0, totalDailyUserUninstalls: 0, currentlyActiveDevices: 0, appCount: 0 };
    }
    platformTotals[plat].totalInstalls += (curr.totalInstallCountByUser || curr.totalDailyUserInstalls || 0);
    platformTotals[plat].totalDailyUserInstalls += (curr.totalDailyUserInstalls || curr.totalInstallCountByUser || 0);
    platformTotals[plat].totalDailyUserUninstalls += (curr.totalDailyUserUninstalls || 0);
    platformTotals[plat].currentlyActiveDevices += (curr.currentlyActiveDevices || 0);
    platformTotals[plat].appCount += 1;

    acc.totalInstallCountByUser += (curr.totalInstallCountByUser || 0);
    acc.totalUninstallCountByUser += (curr.totalUninstallCountByUser || 0);
    acc.totalInstallEventsDetected += (curr.totalInstallEventsDetected || 0);
    acc.totalUninstallEventsDetected += (curr.totalUninstallEventsDetected || 0);
    acc.totalUpdateEventsDetected += (curr.totalUpdateEventsDetected || 0);
    acc.totalDeviceUpgrades += (curr.totalDeviceUpgrades || 0);
    acc.totalDailyDeviceInstalls += (curr.totalDailyDeviceInstalls || 0);
    acc.totalDailyUserInstalls += (curr.totalDailyUserInstalls || 0);
    acc.totalDailyUserUninstalls += (curr.totalDailyUserUninstalls || 0);
    acc.currentlyActiveDevices += (curr.currentlyActiveDevices || 0);

    if (curr.ratingsDistribution) {
      Object.keys(curr.ratingsDistribution).forEach(star => {
        acc.ratingsDistribution[star] = (acc.ratingsDistribution[star] || 0) + (curr.ratingsDistribution[star] || 0);
      });
    }

    (curr.dailyTrends || []).forEach(trend => {
      const existing = acc.dailyTrendsMap.get(trend.date);
      if (existing) {
        existing.activeDevices += (trend.activeDevices || 0);
        existing.dailyInstalls += (trend.dailyInstalls || 0);
        existing.dailyUninstalls += (trend.dailyUninstalls || 0);
        existing.upgrades += (trend.upgrades || 0);
        existing.dailyDeviceInstalls += (trend.dailyDeviceInstalls || 0);
        existing.dailyUserInstalls += (trend.dailyUserInstalls || 0);
        existing.dailyUserUninstalls += (trend.dailyUserUninstalls || 0);
        existing.netGrowth += (trend.netGrowth || 0);
        if (trend.crashRate !== undefined) {
          existing.crashRateCount = (existing.crashRateCount || 0) + 1;
          existing.crashRateSum = (existing.crashRateSum || 0) + trend.crashRate;
          existing.crashRate = existing.crashRateSum / existing.crashRateCount;
        }
        if (trend.anrRate !== undefined) {
          existing.anrRateCount = (existing.anrRateCount || 0) + 1;
          existing.anrRateSum = (existing.anrRateSum || 0) + trend.anrRate;
          existing.anrRate = existing.anrRateSum / existing.anrRateCount;
        }
      } else {
        const copy = { ...trend };
        if (trend.crashRate !== undefined) {
          copy.crashRateCount = 1;
          copy.crashRateSum = trend.crashRate;
        }
        if (trend.anrRate !== undefined) {
          copy.anrRateCount = 1;
          copy.anrRateSum = trend.anrRate;
        }
        acc.dailyTrendsMap.set(trend.date, copy);
      }
    });
    return acc;
  }, {
    totalInstallCountByUser: 0,
    totalUninstallCountByUser: 0,
    totalInstallEventsDetected: 0,
    totalUninstallEventsDetected: 0,
    totalUpdateEventsDetected: 0,
    totalDeviceUpgrades: 0,
    totalDailyDeviceInstalls: 0,
    totalDailyUserInstalls: 0,
    totalDailyUserUninstalls: 0,
    currentlyActiveDevices: 0,
    ratingsDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    dailyTrendsMap: new Map()
  });

  let totalRatingVotes = 0;
  let totalRatingScore = 0;
  Object.entries(aggregated.ratingsDistribution).forEach(([star, count]) => {
    totalRatingVotes += count;
    totalRatingScore += Number(star) * count;
  });
  aggregated.averageRating = totalRatingVotes > 0 ? parseFloat((totalRatingScore / totalRatingVotes).toFixed(2)) : 0;

  aggregated.dailyTrends = Array.from(aggregated.dailyTrendsMap.values()).map(t => {
    delete t.crashRateCount;
    delete t.crashRateSum;
    delete t.anrRateCount;
    delete t.anrRateSum;
    return t;
  }).sort((a, b) => a.date.localeCompare(b.date));

  delete aggregated.dailyTrendsMap;
  
  if (Object.keys(appTrendsMap).length > 0) {
    aggregated.appTrends = appTrendsMap;
  }

  // Determine if aggregated data includes any source with uninstall tracking
  const hasUninstallData = validOverviews.some(item => {
    const curr = item.overview || item;
    return curr.hasUninstallData !== false && curr.platform !== 'apple' && curr.platform !== 'appstore';
  });
  aggregated.hasUninstallData = hasUninstallData;

  const platforms = new Set(validOverviews.map(item => (item.overview || item).platform).filter(Boolean));
  aggregated.platform = platforms.size === 1 ? Array.from(platforms)[0] : 'all';

  // Attach platform-breakdown totals for frontend consumption
  aggregated.platformTotals = platformTotals;

  return aggregated;
}

/**
 * Smart App Pairing Engine:
 * Infers pairings between Google Play apps and Apple App Store apps automatically using normalized name & bundle ID matching,
 * while respecting manual pairing overrides from config.json.
 */
function normalizeAppName(name = '') {
  return String(name)
    .toLowerCase()
    .replace(/\s*\((app store|play store|android|ios)\)\s*/gi, '')
    .replace(/[^a-z0-9]/gi, '');
}

function normalizePackageOrBundle(id = '') {
  return String(id).toLowerCase().trim();
}

function matchAndPairApps(googleApps = [], appleApps = [], manualPairings = []) {
  const paired = [];
  const usedGooglePackages = new Set();
  const usedAppleBundles = new Set();

  // 1. Process explicit manual pairings first
  if (Array.isArray(manualPairings) && manualPairings.length > 0) {
    manualPairings.forEach(pair => {
      const gApp = googleApps.find(g => normalizePackageOrBundle(g.packageName) === normalizePackageOrBundle(pair.googlePackageName));
      const aApp = appleApps.find(a => normalizePackageOrBundle(a.bundleId || a.packageName) === normalizePackageOrBundle(pair.appleBundleId));

      if (gApp || aApp) {
        if (gApp) usedGooglePackages.add(gApp.packageName);
        if (aApp) usedAppleBundles.add(aApp.bundleId || aApp.packageName);
        paired.push({
          id: pair.id || `pair-${pair.googlePackageName || pair.appleBundleId}`,
          name: pair.name || (gApp ? gApp.name : aApp.name),
          googleApp: gApp || null,
          appleApp: aApp || null,
          isManual: true
        });
      }
    });
  }

  // 2. Automated Best-Guess Matching for remaining unpaired apps
  googleApps.forEach(gApp => {
    if (usedGooglePackages.has(gApp.packageName)) return;

    const gNormName = normalizeAppName(gApp.name);
    const gNormPkg = normalizePackageOrBundle(gApp.packageName);

    // Look for exact bundle match or normalized name match
    const match = appleApps.find(aApp => {
      if (usedAppleBundles.has(aApp.bundleId || aApp.packageName)) return false;
      const aNormBundle = normalizePackageOrBundle(aApp.bundleId || aApp.packageName);
      const aNormName = normalizeAppName(aApp.name);

      return gNormPkg === aNormBundle || (gNormName.length > 2 && gNormName === aNormName);
    });

    if (match) {
      usedGooglePackages.add(gApp.packageName);
      usedAppleBundles.add(match.bundleId || match.packageName);
      paired.push({
        id: `pair-${gApp.packageName.split('.').pop()}`,
        name: gApp.name.replace(/\s*\([^)]*\)/g, ''),
        googleApp: gApp,
        appleApp: match,
        isManual: false
      });
    }
  });

  // 3. Collect remaining unpaired items
  const unpairedGoogle = googleApps.filter(g => !usedGooglePackages.has(g.packageName));
  const unpairedApple = appleApps.filter(a => !usedAppleBundles.has(a.bundleId || a.packageName));

  return { paired, unpairedGoogle, unpairedApple };
}

/**
 * Release & Version Correlation Engine:
 * Maps app version releases onto daily trend metrics (installs, uninstalls, crash rates).
 */
function correlateReleases(dailyTrends = [], releases = []) {
  if (!dailyTrends || dailyTrends.length === 0 || !releases || releases.length === 0) {
    return [];
  }

  const trendsByDate = new Map(dailyTrends.map(t => [t.date, t]));

  return releases.map(rel => {
    const relDateStr = rel.releaseDate ? rel.releaseDate.substring(0, 10) : null;
    if (!relDateStr || !trendsByDate.has(relDateStr)) {
      return { ...rel, impact: null };
    }

    const dates = Array.from(trendsByDate.keys()).sort();
    const idx = dates.indexOf(relDateStr);

    const preSlice = dates.slice(Math.max(0, idx - 7), idx).map(d => trendsByDate.get(d));
    const postSlice = dates.slice(idx, Math.min(dates.length, idx + 8)).map(d => trendsByDate.get(d));

    const avgPreInstalls = preSlice.length > 0 ? preSlice.reduce((s, t) => s + (t.dailyInstalls || 0), 0) / preSlice.length : 0;
    const avgPostInstalls = postSlice.length > 0 ? postSlice.reduce((s, t) => s + (t.dailyInstalls || 0), 0) / postSlice.length : 0;

    const avgPreCrashes = preSlice.length > 0 ? preSlice.reduce((s, t) => s + (t.crashRate || 0), 0) / preSlice.length : 0;
    const avgPostCrashes = postSlice.length > 0 ? postSlice.reduce((s, t) => s + (t.crashRate || 0), 0) / postSlice.length : 0;

    const avgPreUninstalls = preSlice.length > 0 ? preSlice.reduce((s, t) => s + (t.dailyUninstalls || 0), 0) / preSlice.length : 0;
    const avgPostUninstalls = postSlice.length > 0 ? postSlice.reduce((s, t) => s + (t.dailyUninstalls || 0), 0) / postSlice.length : 0;

    return {
      ...rel,
      impact: {
        installDeltaPct: avgPreInstalls > 0 ? parseFloat((((avgPostInstalls - avgPreInstalls) / avgPreInstalls) * 100).toFixed(2)) : 0,
        uninstallDeltaPct: avgPreUninstalls > 0 ? parseFloat((((avgPostUninstalls - avgPreUninstalls) / avgPreUninstalls) * 100).toFixed(2)) : 0,
        crashRateDeltaPct: avgPreCrashes > 0 ? parseFloat((((avgPostCrashes - avgPreCrashes) / avgPreCrashes) * 100).toFixed(2)) : 0,
        avgPreInstalls: Math.round(avgPreInstalls),
        avgPostInstalls: Math.round(avgPostInstalls),
        avgPreCrashes: parseFloat(avgPreCrashes.toFixed(4)),
        avgPostCrashes: parseFloat(avgPostCrashes.toFixed(4))
      }
    };
  });
}

/**
 * Retention & Churn Benchmarks Engine:
 * Computes survival rate trends and detects severe churn anomalies (> 2 sigma).
 */
function calculateRetentionBenchmarks(dailyTrends = []) {
  if (!dailyTrends || dailyTrends.length === 0) return { survivalTrend: [], churnAnomalies: [] };

  const uninstallsSeries = dailyTrends.map(t => t.dailyUninstalls || 0);
  const anomalies = zScoreAnomalies(uninstallsSeries, 7, 2.0);

  const churnAnomalies = anomalies.map(anom => ({
    date: dailyTrends[anom.index].date,
    uninstalls: dailyTrends[anom.index].dailyUninstalls || 0,
    zScore: parseFloat(anom.z.toFixed(2)),
    severity: Math.abs(anom.z) > 3.0 ? 'high' : 'medium'
  }));

  const survivalTrend = dailyTrends.map(t => {
    const survivalRate = t.totalInstalls > 0 && t.activeDevices !== undefined
      ? parseFloat(((t.activeDevices / t.totalInstalls) * 100).toFixed(2))
      : null;
    return {
      date: t.date,
      survivalRate,
      activeDevices: t.activeDevices,
      dailyInstalls: t.dailyInstalls,
      dailyUninstalls: t.dailyUninstalls
    };
  });

  return { survivalTrend, churnAnomalies };
}

module.exports = {
  movingAverage,
  rollingStdDev,
  percentChange,
  churnRate,
  installSurvival,
  weekdayAverages,
  zScoreAnomalies,
  concentrationIndex,
  linearForecast,
  aggregateOverviews,
  matchAndPairApps,
  correlateReleases,
  calculateRetentionBenchmarks
};

