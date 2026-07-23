const { db } = require('./index');

async function sqlRollup(packageName, startDate, endDate) {
  if (!db) return null;
  const app = db.prepare('SELECT id FROM app WHERE package_name = ?').get(packageName);
  if (!app) return null;
  const appId = app.id;

  let dateFilter = '';
  const params = [appId];

  if (startDate && endDate) {
    dateFilter = ' AND date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  } else if (startDate) {
    dateFilter = ' AND date >= ?';
    params.push(startDate);
  } else if (endDate) {
    dateFilter = ' AND date <= ?';
    params.push(endDate);
  }

  // Daily Trends
  const trendsStmt = db.prepare(`
    SELECT date,
           user_installs AS dailyInstalls,
           user_uninstalls AS dailyUninstalls,
           device_upgrades AS upgrades,
           user_installs - user_uninstalls AS netGrowth,
           active_devices AS activeDevices
    FROM fact_daily
    WHERE app_id = ? ${dateFilter}
    ORDER BY date ASC
  `);
  const dailyTrends = trendsStmt.all(...params);

  // Ratings
  // To avoid complexity, we can fetch all rating rows for the app and dates
  const ratingsStmt = db.prepare(`
    SELECT date, daily_avg_rating, total_avg_rating, rating_1, rating_2, rating_3, rating_4, rating_5
    FROM fact_rating_daily
    WHERE app_id = ? ${dateFilter}
    ORDER BY date ASC
  `);
  const ratingRows = ratingsStmt.all(...params);
  const ratingMap = new Map();
  ratingRows.forEach(r => {
    ratingMap.set(r.date, {
      dailyAvgRating: r.daily_avg_rating || 0,
      totalAvgRating: r.total_avg_rating || 0,
      ratingsDistribution: {
        1: r.rating_1 || 0,
        2: r.rating_2 || 0,
        3: r.rating_3 || 0,
        4: r.rating_4 || 0,
        5: r.rating_5 || 0,
      }
    });
  });

  // Vitals not in SQL yet, but we will merge rating data into daily trends if needed
  dailyTrends.forEach(trend => {
    const r = ratingMap.get(trend.date);
    if (r) {
      trend.dailyAvgRating = r.dailyAvgRating;
      trend.totalAvgRating = r.totalAvgRating;
      trend.ratingsDistribution = r.ratingsDistribution;
    }
  });

  // Get aggregated values
  // We need MAX of total_user_installs and LAST of active_devices
  const aggStmt = db.prepare(`
    SELECT MAX(total_user_installs) AS totalInstallCountByUser,
           SUM(user_uninstalls) AS totalUninstallCountByUser,
           SUM(install_events) AS totalInstallEventsDetected,
           SUM(uninstall_events) AS totalUninstallEventsDetected,
           SUM(update_events) AS totalUpdateEventsDetected,
           SUM(device_upgrades) AS totalDeviceUpgrades,
           SUM(device_installs) AS totalDailyDeviceInstalls,
           SUM(user_installs) AS totalDailyUserInstalls,
           SUM(user_uninstalls) AS totalDailyUserUninstalls
    FROM fact_daily
    WHERE app_id = ? ${dateFilter}
  `);
  const aggregated = aggStmt.get(...params);

  const currentlyActiveDevices = dailyTrends.length > 0 ? dailyTrends[dailyTrends.length - 1].activeDevices : 0;
  
  let averageRating = 0;
  let ratingsDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  if (ratingRows.length > 0) {
    const latestRating = ratingRows[ratingRows.length - 1];
    averageRating = latestRating.total_avg_rating;
    ratingsDistribution = {
      1: latestRating.rating_1 || 0,
      2: latestRating.rating_2 || 0,
      3: latestRating.rating_3 || 0,
      4: latestRating.rating_4 || 0,
      5: latestRating.rating_5 || 0,
    };
  }

  return {
    currentlyActiveDevices,
    averageRating,
    ratingsDistribution,
    dailyTrends,
    ...aggregated
  };
}

module.exports = {
  sqlRollup
};
