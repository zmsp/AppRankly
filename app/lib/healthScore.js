/**
 * Calculates a unified App Health Score (0-100) and extracts smart alerts.
 * @param {Object} stats - The stats object returned by getAppStats
 * @param {Object} metadata - The app metadata (contains score/ratings)
 * @returns {Object} { score: number, alerts: string[], metrics: Object }
 */
function calculateAppHealthScore(stats, metadata) {
  let score = 100;
  const alerts = [];
  const metrics = {
    growthScore: 0,
    retentionScore: 0,
    stabilityScore: 0,
    ratingScore: 0
  };

  const trends = stats?.dailyTrends || [];
  if (trends.length === 0) return { score: 0, alerts: ['No data available'], metrics };

  // Valid trends with installs
  const validTrends = trends.filter(t => t.date && (t.dailyInstalls > 0 || t.dailyUserInstalls > 0));
  if (validTrends.length > 0) {
    const sorted = [...validTrends].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const latestInstalls = Number(latest.dailyUserInstalls || latest.dailyInstalls || 0);

    // 7-day average excluding the latest day
    const prevDays = sorted.slice(Math.max(0, sorted.length - 8), Math.max(0, sorted.length - 1));
    const avgInstalls = prevDays.length > 0
      ? prevDays.reduce((sum, t) => sum + Number(t.dailyUserInstalls || t.dailyInstalls || 0), 0) / prevDays.length
      : latestInstalls;

    if (avgInstalls > 10 && latestInstalls < avgInstalls * 0.8) {
      const dropPct = Math.round((1 - latestInstalls / avgInstalls) * 100);
      alerts.push(`Downloads dropped by ${dropPct}% yesterday (vs 7-day avg)`);
      metrics.growthScore = Math.max(0, 25 - (dropPct - 20));
    } else if (latestInstalls > avgInstalls * 1.5 && avgInstalls > 10) {
      const spikePct = Math.round((latestInstalls / avgInstalls - 1) * 100);
      alerts.push(`Downloads spiked by ${spikePct}%`);
      metrics.growthScore = 25;
    } else {
      metrics.growthScore = 20; // Normal
    }
  }

  // Calculate Retention (Installs vs Uninstalls)
  const latestTrend = trends[trends.length - 1];
  const installs = Number(latestTrend.dailyUserInstalls || latestTrend.dailyInstalls || 0);
  const uninstalls = Number(latestTrend.dailyUserUninstalls || latestTrend.dailyUninstalls || 0);
  
  if (installs > 0 || uninstalls > 0) {
    const conversion = installs > 0 ? (installs - uninstalls) / installs : -1;
    if (conversion > 0.5) {
      metrics.retentionScore = 25;
    } else if (conversion > 0) {
      metrics.retentionScore = 15;
    } else {
      metrics.retentionScore = 5;
    }
  } else {
    metrics.retentionScore = 15; // Neutral
  }

  // Stability Score (Crashes)
  if (latestTrend.crashRate !== undefined && latestTrend.crashRate !== null) {
    const crashRate = Number(latestTrend.crashRate);
    if (crashRate < 1.09) metrics.stabilityScore = 25;
    else if (crashRate < 2.0) metrics.stabilityScore = 15;
    else {
      metrics.stabilityScore = 0;
      alerts.push(`High crash rate detected: ${crashRate}%`);
    }
  } else {
    metrics.stabilityScore = 25; // Assume stable
  }

  // Rating Score
  if (metadata && metadata.score) {
    const rating = Number(metadata.score);
    if (rating >= 4.5) metrics.ratingScore = 25;
    else if (rating >= 4.0) metrics.ratingScore = 20;
    else if (rating >= 3.5) metrics.ratingScore = 10;
    else {
      metrics.ratingScore = 0;
      alerts.push(`Low average rating: ${rating.toFixed(1)}`);
    }
  } else {
    metrics.ratingScore = 20; // Assume good
  }

  score = metrics.growthScore + metrics.retentionScore + metrics.stabilityScore + metrics.ratingScore;
  score = Math.max(0, Math.min(100, score));

  return { score: Math.round(score), alerts, metrics };
}

module.exports = { calculateAppHealthScore };
