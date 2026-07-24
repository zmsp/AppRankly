const fs = require('fs');
const path = require('path');
const { sendNtfyNotification } = require('./notifier');

let schedulerIntervalHandle = null;
let lastSchedulerRun = null;
let lastSchedulerStatus = { status: 'idle', lastRun: null, appsChecked: 0, notificationsSent: 0 };

/**
 * Gets lookback start and end dates (YYYY-MM-DD) based on range in days.
 */
function getDateRange(rangeDays = 30) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - rangeDays);

  const formatDate = (d) => d.toISOString().split('T')[0];
  return {
    startDate: formatDate(start),
    endDate: formatDate(end)
  };
}

/**
 * Reads the last known stats baseline file.
 */
function getLastKnownStats(dataDir) {
  const filePath = path.join(dataDir, 'last_known_stats.json');
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[Scheduler] Error reading last_known_stats.json:', err.message);
    return {};
  }
}

/**
 * Saves updated last known stats baseline to disk.
 */
function saveLastKnownStats(dataDir, statsMap) {
  const filePath = path.join(dataDir, 'last_known_stats.json');
  try {
    fs.writeFileSync(filePath, JSON.stringify(statsMap, null, 2), 'utf8');
  } catch (err) {
    console.error('[Scheduler] Error writing last_known_stats.json:', err.message);
  }
}

/**
 * Main function to check for stats updates and send notifications.
 */
async function checkAndNotifyStats({ getBaseConfig, DATA_DIR, buildGoogleViewer, buildAppleViewer, fetchPackagesByPlatform }, options = {}) {
  const baseConfig = getBaseConfig();
  if (!baseConfig) {
    console.log('[Scheduler] Skipping stats check: Base configuration not available.');
    return { success: false, reason: 'No configuration' };
  }

  const hoursInterval = baseConfig.refreshIntervalHours || parseInt(process.env.STATS_REFRESH_HOURS, 10) || 1;
  const rangeDays = baseConfig.statsCheckRangeDays || parseInt(process.env.STATS_CHECK_RANGE_DAYS, 10) || 30;
  const ntfyTopic = baseConfig.ntfyTopic || process.env.NTFY_TOPIC || 'zee_appstore';
  const startHour = baseConfig.activeStartHour !== undefined ? Number(baseConfig.activeStartHour) : (process.env.STATS_START_HOUR ? parseInt(process.env.STATS_START_HOUR, 10) : 9);
  const endHour = baseConfig.activeEndHour !== undefined ? Number(baseConfig.activeEndHour) : (process.env.STATS_END_HOUR ? parseInt(process.env.STATS_END_HOUR, 10) : 20);

  const currentHour = new Date().getHours();
  const isWithinActiveHours = (startHour <= endHour)
    ? (currentHour >= startHour && currentHour <= endHour)
    : (currentHour >= startHour || currentHour <= endHour);

  if (!isWithinActiveHours && !options.force) {
    console.log(`[Scheduler] Skipping stats check: Current hour (${currentHour}:00) is outside active window (${startHour}:00 - ${endHour}:00).`);
    lastSchedulerRun = new Date();
    lastSchedulerStatus = {
      status: 'skipped',
      reason: `Outside active window (${startHour}:00 - ${endHour}:00)`,
      currentHour,
      activeStartHour: startHour,
      activeEndHour: endHour,
      lastRun: lastSchedulerRun.toISOString()
    };
    return lastSchedulerStatus;
  }

  const { startDate, endDate } = getDateRange(rangeDays);
  console.log(`[Scheduler] Checking store stats update (Hour: ${currentHour}:00, Range: ${startDate} to ${endDate}, Lookback: ${rangeDays} days, Active: ${startHour}:00-${endHour}:00, Topic: ${ntfyTopic})...`);

  let packages = [];
  try {
    packages = await fetchPackagesByPlatform('all', baseConfig);
  } catch (err) {
    console.error('[Scheduler] Error listing packages:', err.message);
    return { success: false, error: err.message };
  }

  if (!packages || packages.length === 0) {
    console.log('[Scheduler] No packages found to check.');
    return { success: true, appsChecked: 0, notificationsSent: 0 };
  }

  const lastKnownStats = getLastKnownStats(DATA_DIR);
  let notificationsSent = 0;
  let appsChecked = 0;
  const details = [];

  for (const pkg of packages) {
    const platform = pkg.platform;
    const pkgId = pkg.packageName || pkg.bundleId || pkg.appId;
    if (!pkgId) continue;

    const appKey = `${platform}:${pkgId}`;
    const displayName = baseConfig.appMetadata?.[pkgId]?.displayName || pkg.name || pkgId;

    try {
      appsChecked++;
      const viewer = platform === 'apple'
        ? buildAppleViewer(baseConfig, pkgId)
        : buildGoogleViewer(baseConfig, pkgId);

      const stats = await viewer.getAppStats(startDate, endDate);
      const trends = stats?.dailyTrends || [];

      if (!trends || trends.length === 0) {
        console.log(`[Scheduler] No trend data returned for ${displayName} (${platform})`);
        continue;
      }

      // Filter non-zero or valid trend entries
      const validTrends = trends.filter(t => t.date && (t.dailyInstalls > 0 || t.dailyUserInstalls > 0 || t.netGrowth !== 0 || t.upgrades > 0));
      const latestTrend = validTrends.length > 0
        ? validTrends.reduce((max, t) => (t.date > max.date ? t : max), validTrends[0])
        : trends[trends.length - 1];

      if (!latestTrend || !latestTrend.date) continue;

      const currentDailyInstalls = Number(latestTrend.dailyUserInstalls || latestTrend.dailyInstalls || 0);
      const currentDailyUninstalls = Number(latestTrend.dailyUserUninstalls || latestTrend.dailyUninstalls || 0);
      const totalInstalls = stats.overview?.totalInstalls || latestTrend.totalInstalls || 'N/A';
      const prevRecord = lastKnownStats[appKey];

      let isNewData = false;
      let notifTitle = '';
      let notifMsg = '';

      if (!prevRecord) {
        // Initial baseline creation
        console.log(`[Scheduler] Baseline initialized for ${displayName} (${platform}). Latest date: ${latestTrend.date}`);
      } else if (latestTrend.date > prevRecord.lastDate) {
        // New date row discovered!
        isNewData = true;
        notifTitle = `🚀 New Stats: ${displayName}`;
        notifMsg = `New daily stats available for ${displayName} (${platform.toUpperCase()})!\n📅 Date: ${latestTrend.date}\n📥 Installs: +${currentDailyInstalls}\n📤 Uninstalls: -${currentDailyUninstalls}\n📊 Total Installs: ${totalInstalls}`;
      } else if (latestTrend.date === prevRecord.lastDate && currentDailyInstalls > (prevRecord.dailyInstalls || 0)) {
        // Updated numbers for latest date!
        const diff = currentDailyInstalls - (prevRecord.dailyInstalls || 0);
        isNewData = true;
        notifTitle = `📈 Updated Stats: ${displayName}`;
        notifMsg = `Stats updated for ${displayName} (${platform.toUpperCase()}) on ${latestTrend.date}!\n📥 New Installs: ${currentDailyInstalls} (+${diff})\n📊 Total Installs: ${totalInstalls}`;
      }

      if (isNewData) {
        console.log(`[Scheduler] Discovered new stats for ${displayName}! Sending notification...`);
        const res = await sendNtfyNotification({
          title: notifTitle,
          message: notifMsg,
          priority: 'high',
          tags: 'chart_with_upwards_trend,package',
          topic: ntfyTopic
        });

        if (res.success) {
          notificationsSent++;
          details.push({ app: displayName, platform, date: latestTrend.date, status: 'Notified' });
        }
      }

      // Update baseline state for this app
      lastKnownStats[appKey] = {
        lastDate: latestTrend.date,
        dailyInstalls: currentDailyInstalls,
        dailyUninstalls: currentDailyUninstalls,
        totalInstalls,
        updatedAt: new Date().toISOString()
      };

    } catch (err) {
      console.error(`[Scheduler] Error checking stats for ${displayName} (${platform}):`, err.message);
    }
  }

  saveLastKnownStats(DATA_DIR, lastKnownStats);

  lastSchedulerRun = new Date();
  lastSchedulerStatus = {
    status: 'completed',
    lastRun: lastSchedulerRun.toISOString(),
    appsChecked,
    notificationsSent,
    hoursInterval,
    rangeDays,
    activeStartHour: startHour,
    activeEndHour: endHour,
    currentHour,
    ntfyTopic
  };

  console.log(`[Scheduler] Stats check finished. Checked: ${appsChecked} apps, Notifications sent: ${notificationsSent}`);
  return lastSchedulerStatus;
}

/**
 * Starts periodic scheduler background timer.
 */
function startPeriodicScheduler(helpers) {
  if (schedulerIntervalHandle) {
    clearInterval(schedulerIntervalHandle);
    schedulerIntervalHandle = null;
  }

  const baseConfig = helpers.getBaseConfig();
  const hoursInterval = baseConfig?.refreshIntervalHours || parseInt(process.env.STATS_REFRESH_HOURS, 10) || 1;
  const intervalMs = Math.max(1, hoursInterval) * 60 * 60 * 1000;

  console.log(`[Scheduler] Starting periodic store stats refresh every ${hoursInterval} hour(s)...`);

  // Run initial check after 20 seconds delay to let server start up smoothly
  setTimeout(() => {
    checkAndNotifyStats(helpers).catch(err => {
      console.error('[Scheduler] Initial run error:', err.message);
    });
  }, 20000);

  schedulerIntervalHandle = setInterval(() => {
    checkAndNotifyStats(helpers).catch(err => {
      console.error('[Scheduler] Interval run error:', err.message);
    });
  }, intervalMs);
}

function getSchedulerStatus() {
  return lastSchedulerStatus;
}

module.exports = {
  checkAndNotifyStats,
  startPeriodicScheduler,
  getSchedulerStatus
};
