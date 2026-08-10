const fs = require('fs');
const path = require('path');
const { sendNtfyNotification, sendWebhookNotification, broadcastAlert } = require('./notifier');

let schedulerIntervalHandle = null;
let lastSchedulerRun = null;
let lastSchedulerStatus = { status: 'idle', lastRun: null, appsChecked: 0, notificationsSent: 0 };
let isCheckRunning = false;

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
 * Reads the last known stats baseline file safely.
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
 * Saves updated last known stats baseline to disk safely.
 */
function saveLastKnownStats(dataDir, statsMap) {
  const filePath = path.join(dataDir, 'last_known_stats.json');
  const tempPath = path.join(dataDir, 'last_known_stats.json.tmp');
  try {
    fs.writeFileSync(tempPath, JSON.stringify(statsMap, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error('[Scheduler] Error writing last_known_stats.json:', err.message);
  }
}

/**
 * B5 Auto-Detect New Version Releases
 */
function autoDetectRelease(dataDir, pkgId, platform, version, recentChanges, date) {
  if (!version) return;
  const releasesFile = path.join(dataDir, 'releases.json');
  let releases = [];
  if (fs.existsSync(releasesFile)) {
    try {
      releases = JSON.parse(fs.readFileSync(releasesFile, 'utf8'));
    } catch (e) {}
  }

  const exists = releases.some(r => r.version === version && (r.packageName === pkgId || r.platform === platform));
  if (!exists) {
    releases.push({
      version,
      platform,
      packageName: pkgId,
      releaseDate: date || new Date().toISOString().split('T')[0],
      notes: recentChanges || `Auto-detected release v${version}`,
      source: 'auto'
    });
    fs.writeFileSync(releasesFile, JSON.stringify(releases, null, 2), 'utf8');
    console.log(`[Scheduler] Auto-detected release v${version} for ${pkgId}`);
  }
}

/**
 * Main function to check for stats updates and send notifications.
 */
async function checkAndNotifyStats({ getBaseConfig, DATA_DIR, buildGoogleViewer, buildAppleViewer, fetchPackagesByPlatform }, options = {}) {
  if (isCheckRunning && !options.force) {
    console.log('[Scheduler] Check already in progress, skipping concurrent run.');
    return { status: 'skipped', reason: 'Check already in progress' };
  }

  const baseConfig = getBaseConfig();
  if (!baseConfig) {
    console.log('[Scheduler] Skipping stats check: Base configuration not available.');
    return { success: false, reason: 'No configuration' };
  }

  isCheckRunning = true;

  try {
    const hoursInterval = baseConfig.refreshIntervalHours || parseInt(process.env.STATS_REFRESH_HOURS, 10) || 1;
    const rangeDays = baseConfig.statsCheckRangeDays || parseInt(process.env.STATS_CHECK_RANGE_DAYS, 10) || 30;
    const ntfyTopic = (baseConfig.ntfyTopic !== undefined ? baseConfig.ntfyTopic : process.env.NTFY_TOPIC) || '';
    const webhookUrl = baseConfig.webhookUrl || process.env.WEBHOOK_URL || '';
    const startHour = baseConfig.activeStartHour !== undefined ? Number(baseConfig.activeStartHour) : (process.env.STATS_START_HOUR ? parseInt(process.env.STATS_START_HOUR, 10) : 9);
    const endHour = baseConfig.activeEndHour !== undefined ? Number(baseConfig.activeEndHour) : (process.env.STATS_END_HOUR ? parseInt(process.env.STATS_END_HOUR, 10) : 20);

    // Compute current hour considering configured timezone if available
    let currentHour = new Date().getHours();
    if (baseConfig.timezone) {
      try {
        const formattedHour = new Date().toLocaleTimeString('en-US', { timeZone: baseConfig.timezone, hour12: false, hour: 'numeric' });
        currentHour = parseInt(formattedHour, 10);
      } catch (e) {
        console.warn(`[Scheduler] Invalid timezone config (${baseConfig.timezone}), falling back to system time.`);
      }
    }

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
    const updatedApps = [];
    let totalCombinedInstalls = 0;
    let totalCombinedUninstalls = 0;

    // Concurrently fetch app stats for all packages using Promise.allSettled
    const fetchPromises = packages.map(async (pkg) => {
      const platform = pkg.platform;
      const pkgId = pkg.packageName || pkg.bundleId || pkg.appId;
      if (!pkgId) return null;

      const appKey = `${platform}:${pkgId}`;
      const displayName = baseConfig.appMetadata?.[pkgId]?.displayName || pkg.name || pkgId;

      try {
        const viewer = platform === 'apple'
          ? buildAppleViewer(baseConfig, pkgId)
          : buildGoogleViewer(baseConfig, pkgId);

        const stats = await viewer.getAppStats(startDate, endDate, { force: Boolean(options.force), forceRefresh: Boolean(options.force) });
        const trends = stats?.dailyTrends || [];

        if (!trends || trends.length === 0) {
          console.log(`[Scheduler] No trend data returned for ${displayName} (${platform})`);
          return null;
        }

        const validTrends = trends.filter(t => t.date && (t.dailyInstalls > 0 || t.dailyUserInstalls > 0 || t.netGrowth !== 0 || t.upgrades > 0));
        const latestTrend = validTrends.length > 0
          ? validTrends.reduce((max, t) => (t.date > max.date ? t : max), validTrends[0])
          : trends[trends.length - 1];

        if (!latestTrend || !latestTrend.date) return null;

        const currentDailyInstalls = Number(latestTrend.dailyUserInstalls || latestTrend.dailyInstalls || 0);
        const currentDailyUninstalls = Number(latestTrend.dailyUserUninstalls || latestTrend.dailyUninstalls || 0);
        const totalInstalls = stats.overview?.totalInstalls || latestTrend.totalInstalls || 'N/A';
        const prevRecord = lastKnownStats[appKey];

        let isNewData = false;

        if (!prevRecord) {
          console.log(`[Scheduler] Baseline initialized for ${displayName} (${platform}). Latest date: ${latestTrend.date}`);
        } else if (latestTrend.date > prevRecord.lastDate) {
          isNewData = true;
        } else if (latestTrend.date === prevRecord.lastDate && currentDailyInstalls > (prevRecord.dailyInstalls || 0)) {
          isNewData = true;
        }

        // Check Churn Anomaly Alert (immediate urgent alert)
        if (stats.retentionBenchmarks?.churnAnomalies?.length > 0) {
          const highAnom = stats.retentionBenchmarks.churnAnomalies.find(a => a.severity === 'high' && a.date === latestTrend.date);
          if (highAnom && (!prevRecord || prevRecord.lastAnomalyDate !== latestTrend.date)) {
            broadcastAlert({
              title: `⚠️ Churn Anomaly: ${displayName}`,
              message: `High uninstall spike detected on ${latestTrend.date}: ${highAnom.uninstalls} uninstalls (z=${highAnom.zScore}).`,
              priority: 'urgent',
              tags: 'warning,warning',
              topic: ntfyTopic,
              webhookUrl
            }).catch(e => console.error('[Scheduler] Anomaly alert error:', e.message));
          }
        }

        return {
          appKey,
          displayName,
          platform: platform.toUpperCase(),
          date: latestTrend.date,
          installs: currentDailyInstalls,
          uninstalls: currentDailyUninstalls,
          totalInstalls,
          isNewData,
          lastAnomalyDate: stats.retentionBenchmarks?.churnAnomalies?.find(a => a.severity === 'high')?.date || null
        };
      } catch (err) {
        console.error(`[Scheduler] Error checking stats for ${displayName} (${platform}):`, err.message);
        return null;
      }
    });

    const results = await Promise.allSettled(fetchPromises);

    for (const res of results) {
      if (res.status === 'fulfilled' && res.value) {
        appsChecked++;
        const item = res.value;

        if (item.isNewData) {
          updatedApps.push(item);
          totalCombinedInstalls += item.installs;
          totalCombinedUninstalls += item.uninstalls;
        }

        // Update baseline state for this app
        lastKnownStats[item.appKey] = {
          lastDate: item.date,
          dailyInstalls: item.installs,
          dailyUninstalls: item.uninstalls,
          totalInstalls: item.totalInstalls,
          lastAnomalyDate: item.lastAnomalyDate,
          updatedAt: new Date().toISOString()
        };
      }
    }

    // Send single consolidated notification after checking all apps per period
    if (updatedApps.length > 0) {
      console.log(`[Scheduler] Discovered new stats for ${updatedApps.length} app(s). Broadcasting consolidated notification...`);
      const lines = updatedApps.map(app =>
        `📱 ${app.displayName} (${app.platform}): +${app.installs} installs, -${app.uninstalls} uninstalls (Total: ${app.totalInstalls})`
      );

      const title = updatedApps.length === 1
        ? `🚀 New Stats: ${updatedApps[0].displayName}`
        : `🚀 App Stats Update (${updatedApps.length} Apps)`;

      const message = `${lines.join('\n')}\n\n📊 Combined Total: +${totalCombinedInstalls} installs, -${totalCombinedUninstalls} uninstalls across ${updatedApps.length} app(s)`;

      const res = await broadcastAlert({
        title,
        message,
        priority: 'high',
        tags: 'chart_with_upwards_trend,package',
        topic: ntfyTopic,
        webhookUrl
      });

      if (res.ntfyResult?.success || res.webhookResult?.success) {
        notificationsSent = 1;
        for (const app of updatedApps) {
          details.push({ app: app.displayName, platform: app.platform, date: app.date, status: 'Notified' });
        }
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
  } finally {
    isCheckRunning = false;
  }
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
