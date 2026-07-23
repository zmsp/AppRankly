/**
 * Calculates a composite health score (0-100) based on available app metrics.
 *
 * Weights (Target):
 * - Average Rating (30d): 25%
 * - Rating Trend: 15%
 * - Install-to-Uninstall Ratio: 20%
 * - Retention (Active/Total): 25%
 * - Crash-free Rate: 15%
 */
export function calculateHealthScore(stats) {
  if (!stats) return 0;

  let score = 0;
  let totalWeight = 0;

  // 1. Average Rating (0-5 scale mapped to 0-100)
  if (stats.averageRating) {
    const ratingWeight = 25;
    const ratingScore = (stats.averageRating / 5) * 100;
    score += (ratingScore * (ratingWeight / 100));
    totalWeight += ratingWeight;
  }

  // 2. Install-to-Uninstall Ratio
  // Target ratio is > 3:1 for perfect score
  const installs = stats.totalDailyUserInstalls || 1;
  const uninstalls = stats.totalDailyUserUninstalls || 0;
  const ratio = uninstalls === 0 ? 5 : (installs / uninstalls);
  const ratioWeight = 20;
  const ratioScore = Math.min(100, (ratio / 3) * 100);
  score += (ratioScore * (ratioWeight / 100));
  totalWeight += ratioWeight;

  // 3. Retention Proxy (Active Devices / Total Installs)
  if (stats.totalInstallCountByUser > 0) {
    const retentionWeight = 25;
    const retentionRate = (stats.currentlyActiveDevices / stats.totalInstallCountByUser) * 100;
    // We normalize this because 100% retention is impossible. Let's say 40% is "perfect" for this metric.
    const normalizedRetention = Math.min(100, (retentionRate / 40) * 100);
    score += (normalizedRetention * (retentionWeight / 100));
    totalWeight += retentionWeight;
  }

  // 4. Rating Trend (if we have trends)
  if (stats.dailyTrends && stats.dailyTrends.length >= 2) {
    const trendWeight = 15;
    const half = Math.floor(stats.dailyTrends.length / 2);
    const recent = stats.dailyTrends.slice(half);
    const older = stats.dailyTrends.slice(0, half);

    const recentSum = recent.reduce((acc, curr) => acc + (curr.dailyAvgRating || 0), 0);
    const olderSum = older.reduce((acc, curr) => acc + (curr.dailyAvgRating || 0), 0);
    const recentAvg = recentSum / (recent.length || 1);
    const olderAvg = olderSum / (older.length || 1);

    let trendScore = 70; // Base score
    if (recentAvg > olderAvg) trendScore = 100;
    else if (recentAvg < olderAvg) trendScore = 40;

    if (recentSum > 0) { // Only count if we actually have rating data
      score += (trendScore * (trendWeight / 100));
      totalWeight += trendWeight;
    }
  }

  // Normalize if we don't have all metrics
  if (totalWeight === 0) return 0;
  return Math.round((score / totalWeight) * 100);
}

export function getHealthBand(score) {
  if (score >= 90) return { label: 'Excellent', color: 'emerald', icon: '🟢' };
  if (score >= 70) return { label: 'Good', color: 'blue', icon: '🔵' };
  if (score >= 50) return { label: 'Needs Work', color: 'amber', icon: '🟡' };
  return { label: 'At Risk', color: 'rose', icon: '🔴' };
}
