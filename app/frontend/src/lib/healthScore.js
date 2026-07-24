/**
 * Calculates a composite health score (0-100) based on available app metrics.
 *
 * Weights (Target):
 * - Average Rating (30d): 25%
 * - Rating Trend: 15%
 * - Install-to-Uninstall Ratio: 20% (Google Play only)
 * - Retention (Active/Total): 25% (Requires active device telemetry)
 * - Acquisition Trend: 25% (Evaluated from install velocity)
 */
export function calculateHealthScore(stats) {
  if (!stats) return 0;

  let score = 0;
  let totalWeight = 0;

  const installs = stats.totalInstallCountByUser || stats.totalDailyUserInstalls || 0;

  // 1. Average Rating (0-5 scale mapped to 0-100)
  if (stats.averageRating && stats.averageRating > 0) {
    const ratingWeight = 25;
    const ratingScore = (stats.averageRating / 5) * 100;
    score += (ratingScore * (ratingWeight / 100));
    totalWeight += ratingWeight;
  }

  // Detect if stats belong to Apple or platform without uninstall metrics
  const hasUninstallData = stats.hasUninstallData !== false &&
    !['apple', 'appstore', 'ios'].includes(stats.platform?.toLowerCase()) &&
    !['apple', 'appstore', 'ios'].includes(stats.store?.toLowerCase());

  // 2. Install-to-Uninstall Ratio (Only evaluated when uninstall metrics exist)
  if (hasUninstallData) {
    const dailyInstalls = stats.totalDailyUserInstalls || 1;
    const uninstalls = stats.totalDailyUserUninstalls || 0;
    const ratio = uninstalls === 0 ? 5 : (dailyInstalls / uninstalls);
    const ratioWeight = 20;
    const ratioScore = Math.min(100, (ratio / 3) * 100);
    score += (ratioScore * (ratioWeight / 100));
    totalWeight += ratioWeight;
  }

  // 3. Retention Proxy (Active Devices / Total Installs)
  // ONLY evaluate if we have recorded active device telemetry (> 0)
  if (installs > 0 && stats.currentlyActiveDevices > 0) {
    const retentionWeight = 25;
    const retentionRate = (stats.currentlyActiveDevices / installs) * 100;
    // We normalize this because 100% retention is impossible. Let's say 40% is "perfect" for this metric.
    const normalizedRetention = Math.min(100, (retentionRate / 40) * 100);
    score += (normalizedRetention * (retentionWeight / 100));
    totalWeight += retentionWeight;
  }

  // 4. Rating Trend (if we have ratings over time)
  if (stats.dailyTrends && stats.dailyTrends.length >= 2) {
    const half = Math.floor(stats.dailyTrends.length / 2);
    const recent = stats.dailyTrends.slice(half);
    const older = stats.dailyTrends.slice(0, half);

    const recentSum = recent.reduce((acc, curr) => acc + (curr.totalAvgRating || curr.dailyAvgRating || 0), 0);
    const olderSum = older.reduce((acc, curr) => acc + (curr.totalAvgRating || curr.dailyAvgRating || 0), 0);

    if (recentSum > 0 && olderSum > 0) {
      const trendWeight = 15;
      const recentAvg = recentSum / recent.length;
      const olderAvg = olderSum / older.length;

      let trendScore = 70; // Base score
      if (recentAvg > olderAvg) trendScore = 100;
      else if (recentAvg < olderAvg) trendScore = 40;

      score += (trendScore * (trendWeight / 100));
      totalWeight += trendWeight;
    }
  }

  // 5. Install Acquisition Trend (Evaluated for all apps with daily trends)
  if (stats.dailyTrends && stats.dailyTrends.length >= 2) {
    const half = Math.floor(stats.dailyTrends.length / 2);
    const recent = stats.dailyTrends.slice(half);
    const older = stats.dailyTrends.slice(0, half);

    const recentInstalls = recent.reduce((acc, curr) => acc + (curr.dailyUserInstalls || curr.dailyInstalls || 0), 0);
    const olderInstalls = older.reduce((acc, curr) => acc + (curr.dailyUserInstalls || curr.dailyInstalls || 0), 0);

    if (recentInstalls > 0 || olderInstalls > 0) {
      const installTrendWeight = 25;
      let installTrendScore = 75; // Baseline for active acquisition

      if (olderInstalls === 0 && recentInstalls > 0) {
        installTrendScore = 100; // New acquisition growth
      } else if (olderInstalls > 0) {
        const growthRatio = recentInstalls / olderInstalls;
        if (growthRatio >= 1.2) installTrendScore = 100;      // Growing +20%
        else if (growthRatio >= 0.9) installTrendScore = 80;  // Stable
        else if (growthRatio >= 0.6) installTrendScore = 60;  // Moderate decline
        else installTrendScore = 40;                          // Sharp decline
      }

      score += (installTrendScore * (installTrendWeight / 100));
      totalWeight += installTrendWeight;
    }
  }

  // Fallback if totalWeight is 0 but app has active userbase/installs
  if (totalWeight === 0) return installs > 0 ? 75 : 0;
  return Math.round((score / totalWeight) * 100);
}

export function getHealthBand(score) {
  if (score >= 90) return { label: 'Excellent', color: 'emerald', icon: '' };
  if (score >= 70) return { label: 'Good', color: 'blue', icon: '' };
  if (score >= 50) return { label: 'Needs Work', color: 'amber', icon: '' };
  return { label: 'At Risk', color: 'rose', icon: '' };
}
