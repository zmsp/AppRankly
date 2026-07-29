const axios = require('axios');
const jwt = require('jsonwebtoken');
const zlib = require('zlib');
const csv = require('@fast-csv/parse');
const fs = require('fs');
const path = require('path');
const resolver = require('./resolver');

const FIRST_INSTALL_TYPES = new Set(['1', '1E', '1F', '1T', 'F1']);
const REDOWNLOAD_TYPES = new Set(['7', '7F', '7E', 'F7']);
const UPDATE_TYPES = new Set(['3', '3F']);

function parseMMDDYYYY(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  return dateStr;
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function generateDateArray(startDateStr, endDateStr) {
  let start = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 86400000);
  let end = endDateStr ? new Date(endDateStr) : new Date(Date.now() - 86400000);

  if (isNaN(start.getTime())) start = new Date(Date.now() - 30 * 86400000);
  if (isNaN(end.getTime())) end = new Date(Date.now() - 86400000);

  const dates = [];
  let curr = new Date(start);
  while (curr <= end) {
    dates.push(formatDate(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

class AppleAppStoreStatsViewer {
  constructor({ issuerId, keyId, privateKey, vendorId, appId, dataDir }) {
    this.issuerId = issuerId;
    this.keyId = keyId;
    this.privateKey = privateKey;
    this.vendorId = vendorId || process.env.APPLE_VENDOR_NUMBER;
    this.appId = appId; // This can be numeric ID or bundle ID
    this.numericAppId = null;
    this.token = null;
    this.tokenExpiry = 0;
    this.dataDir = dataDir || path.join(process.cwd(), "data");
    this.cacheDir = path.join(this.dataDir, "download_stats", "apple");
  }

  async getNumericAppId() {
    if (this.numericAppId) return this.numericAppId;

    if (!this.appId) {
      console.log("No App ID provided. Fetching apps...");
      try {
        const apps = await this.listPackages();
        if (apps && apps.length > 0) {
          const firstApp = apps[0];
          this.appId = firstApp.bundleId;
          this.numericAppId = firstApp.appId;
          console.log(`[DEBUG] No appId provided, selected first app: ${firstApp.name} (${this.numericAppId})`);
          return this.numericAppId;
        } else {
          throw new Error("No apps found in Apple account.");
        }
      } catch (err) {
        console.error("Failed to fetch apps dynamically:", err.message);
        throw err;
      }
    }

    if (/^\d+$/.test(this.appId)) {
      this.numericAppId = this.appId;
      return this.numericAppId;
    }

    this.numericAppId = await resolver.resolve('apple:appid', { issuerId: this.issuerId, keyId: this.keyId, appId: this.appId }, async () => {
      console.log(`[DEBUG] Resolving numeric ID for bundleId: ${this.appId}`);
      const token = this.generateToken();
      const url = `https://api.appstoreconnect.apple.com/v1/apps?filter[bundleId]=${this.appId}`;
      try {
        const res = await axios.get(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.data.data && res.data.data.length > 0) {
          const resolvedId = res.data.data[0].id;
          console.log(`[DEBUG] Resolved ${this.appId} to numeric ID: ${resolvedId}`);
          return resolvedId;
        }
      } catch (err) {
        console.error(`[DEBUG] Failed to resolve bundleId ${this.appId}:`, err.response?.data || err.message);
        throw err;
      }
      throw new Error(`Could not find Apple app with bundle ID: ${this.appId}`);
    });

    return this.numericAppId;
  }

  generateToken(force = false) {
    const now = Math.floor(Date.now() / 1000);
    if (!force && this.token && now < this.tokenExpiry - 60) return this.token;

    if (!this.issuerId || !this.keyId || !this.privateKey) {
      throw new Error("Missing Apple App Store credentials.");
    }

    const payload = {
      iss: this.issuerId,
      iat: now,
      exp: now + 1199, // 19 minutes 59 seconds (max allowed is 20m)
      aud: 'appstoreconnect-v1'
    };

    this.token = jwt.sign(payload, this.privateKey, {
      algorithm: 'ES256',
      header: { kid: this.keyId, typ: 'JWT' }
    });
    this.tokenExpiry = payload.exp;
    return this.token;
  }

  static disabledVendors = new Set();
  static earliestReleaseDateMap = new Map();

  async findEarliestDataDate(dateList) {
    if (!dateList || dateList.length <= 14) return 0;

    const cacheKey = this.appId || this.vendorId;
    if (cacheKey && AppleAppStoreStatsViewer.earliestReleaseDateMap.has(cacheKey)) {
      const knownEarliest = AppleAppStoreStatsViewer.earliestReleaseDateMap.get(cacheKey);
      const knownIdx = dateList.indexOf(knownEarliest);
      if (knownIdx > 0) {
        for (let i = 0; i < knownIdx; i++) {
          const cacheFile = path.join(this.cacheDir, `sales_${dateList[i]}.txt`);
          if (!fs.existsSync(cacheFile)) {
            try { fs.writeFileSync(cacheFile, '__EMPTY__', 'utf8'); } catch {}
          }
        }
        return knownIdx;
      }
    }

    const startDateTxt = await this.fetchDailySalesReport(dateList[0]);
    if (startDateTxt && startDateTxt !== '__EMPTY__') {
      return 0;
    }

    console.log(`[DEBUG] Large date range (${dateList.length} days) starting with missing data for ${this.appId}. Running binary search boundary probe...`);

    let low = 0;
    let high = dateList.length - 1;
    let earliestFoundIdx = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midDate = dateList[mid];
      const rawTxt = await this.fetchDailySalesReport(midDate);

      if (rawTxt && rawTxt !== '__EMPTY__') {
        earliestFoundIdx = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    if (earliestFoundIdx > 0) {
      const earliestDate = dateList[earliestFoundIdx];
      console.log(`[DEBUG] Binary search boundary found: earliest release data date for ${this.appId} is ${earliestDate} (index ${earliestFoundIdx}/${dateList.length})`);
      if (cacheKey) {
        AppleAppStoreStatsViewer.earliestReleaseDateMap.set(cacheKey, earliestDate);
      }
      for (let i = 0; i < earliestFoundIdx; i++) {
        const cacheFile = path.join(this.cacheDir, `sales_${dateList[i]}.txt`);
        if (!fs.existsSync(cacheFile)) {
          try { fs.writeFileSync(cacheFile, '__EMPTY__', 'utf8'); } catch {}
        }
      }
      return earliestFoundIdx;
    } else if (earliestFoundIdx === -1) {
      for (let i = 0; i < dateList.length; i++) {
        const cacheFile = path.join(this.cacheDir, `sales_${dateList[i]}.txt`);
        if (!fs.existsSync(cacheFile)) {
          try { fs.writeFileSync(cacheFile, '__EMPTY__', 'utf8'); } catch {}
        }
      }
      return dateList.length;
    }

    return 0;
  }

  async fetchDailySalesReport(dateStr) {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
    const isRecentDate = dateStr >= twoDaysAgo;

    const cacheFile = path.join(this.cacheDir, `sales_${dateStr}.txt`);
    if (fs.existsSync(cacheFile)) {
      const content = fs.readFileSync(cacheFile, 'utf8');
      const isMissing = (content === '__EMPTY__' || content === 'NO_DATA');
      if (!isMissing) return content;
      // If cached data is empty/missing, only return null if it's an old date.
      // For recent dates, attempt a repull as Apple might have published the report since last fetch.
      if (!isRecentDate) return null;
      console.log(`[DEBUG] Apple sales report for recent date ${dateStr} is missing/empty in cache. Attempting repull...`);
    }

    if (!this.vendorId || AppleAppStoreStatsViewer.disabledVendors.has(this.vendorId)) {
      return null;
    }

    return resolver.resolve('apple:sales_report', { vendorId: this.vendorId, dateStr }, async () => {
      if (fs.existsSync(cacheFile)) {
        const content = fs.readFileSync(cacheFile, 'utf8');
        const isMissing = (content === '__EMPTY__' || content === 'NO_DATA');
        if (!isMissing) return content;
        if (!isRecentDate) return null;
      }

      if (AppleAppStoreStatsViewer.disabledVendors.has(this.vendorId)) {
        return null;
      }

      const token = this.generateToken();
      const url = 'https://api.appstoreconnect.apple.com/v1/salesReports';
      const params = {
        'filter[vendorNumber]': this.vendorId,
        'filter[reportType]': 'SALES',
        'filter[reportSubType]': 'SUMMARY',
        'filter[frequency]': 'DAILY',
        'filter[reportDate]': dateStr
      };

      try {
        console.log(`[DEBUG] Fetching Apple Sales Report for ${dateStr}...`);
        const response = await axios({
          method: 'get',
          url,
          params,
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'arraybuffer'
        });

        const rawTxt = zlib.gunzipSync(response.data).toString('utf8');
        fs.writeFileSync(cacheFile, rawTxt, 'utf8');
        return rawTxt;
      } catch (err) {
        if (err.response && err.response.status === 404) {
          // Report not generated yet or no sales for that date — write negative cache
          try { fs.writeFileSync(cacheFile, '__EMPTY__', 'utf8'); } catch {}
          return null;
        }
        if (err.response && (err.response.status === 400 || err.response.status === 403)) {
          // Vendor not active/authorized or invalid
          console.warn(`[Apple API] Sales reports unavailable for vendor ${this.vendorId} (HTTP ${err.response.status}). Disabling further sales report requests.`);
          AppleAppStoreStatsViewer.disabledVendors.add(this.vendorId);
          try { fs.writeFileSync(cacheFile, '__EMPTY__', 'utf8'); } catch {}
          return null;
        }
        console.error(`[DEBUG] Error fetching sales report for ${dateStr}:`, err.message);
        return null;
      }
    });
  }

  async getAppStats(startDate, endDate) {
    const numericId = await this.getNumericAppId();
    console.log(`[DEBUG] Starting getAppStats for ${this.appId} (${numericId})`);

    const dateList = generateDateArray(startDate, endDate);
    const earliestIdx = await this.findEarliestDataDate(dateList);
    const activeDates = dateList.slice(earliestIdx);

    const mergedTrends = new Map();

    // Initialize trend entries for all dates in range
    dateList.forEach(d => {
      mergedTrends.set(d, {
        date: d,
        dailyInstalls: 0,
        dailyUninstalls: 0,
        dailyUserInstalls: 0,
        dailyUserUninstalls: 0,
        netGrowth: 0,
        activeDevices: 0,
        upgrades: 0,
        revenue: 0,
        netRevenue: 0,
        impressions: 0,
        pageViews: 0,
        sessions: 0,
        crashes: 0
      });
    });

    // Parallel fetch for active dates only
    const reports = await Promise.all(
      activeDates.map(async (dateStr) => {
        const rawTxt = await this.fetchDailySalesReport(dateStr);
        return { dateStr, rawTxt };
      })
    );

    for (const { dateStr, rawTxt } of reports) {
      if (!rawTxt || rawTxt === '__EMPTY__') continue;

      await new Promise((resolve) => {
        csv.parseString(rawTxt, { headers: true, delimiter: '\t' })
          .on('data', (row) => {
            const appleId = (row['Apple Identifier'] || '').trim();
            if (appleId !== String(numericId)) return;

            const rowDate = parseMMDDYYYY(row['Begin Date']) || dateStr;
            const trend = mergedTrends.get(rowDate) || {
              date: rowDate,
              dailyInstalls: 0,
              dailyUninstalls: 0,
              dailyUserInstalls: 0,
              dailyUserUninstalls: 0,
              netGrowth: 0,
              activeDevices: 0,
              upgrades: 0,
              revenue: 0,
              netRevenue: 0,
              impressions: 0,
              pageViews: 0,
              sessions: 0,
              crashes: 0
            };

            const units = parseInt(row['Units']) || 0;
            const proceeds = parseFloat(row['Developer Proceeds']) || 0;
            const productType = (row['Product Type Identifier'] || '').trim();

            if (FIRST_INSTALL_TYPES.has(productType)) {
              trend.dailyInstalls += units;
            } else if (REDOWNLOAD_TYPES.has(productType) || UPDATE_TYPES.has(productType)) {
              trend.upgrades += units;
            }

            trend.revenue += proceeds * units;
            trend.netRevenue = trend.revenue;
            trend.dailyUserInstalls = trend.dailyInstalls;
            trend.netGrowth = trend.dailyInstalls - trend.dailyUninstalls;

            mergedTrends.set(rowDate, trend);
          })
          .on('end', () => resolve());
      });
    }

    const dailyTrends = Array.from(mergedTrends.values()).sort((a, b) => a.date.localeCompare(b.date));

    const aggregated = dailyTrends.reduce((acc, t) => {
      acc.totalInstallCountByUser += (t.dailyInstalls || 0);
      acc.totalUninstallCountByUser += (t.dailyUninstalls || 0);
      acc.totalUpdateEventsDetected += (t.upgrades || 0);
      acc.totalRevenue += (t.revenue || 0);
      acc.totalImpressions += (t.impressions || 0);
      if (t.activeDevices > 0) acc.currentlyActiveDevices = t.activeDevices;
      return acc;
    }, {
      totalInstallCountByUser: 0,
      totalUninstallCountByUser: 0,
      totalInstallEventsDetected: 0,
      totalUninstallEventsDetected: 0,
      totalUpdateEventsDetected: 0,
      totalDeviceUpgrades: 0,
      totalRevenue: 0,
      totalImpressions: 0,
      currentlyActiveDevices: 0
    });

    aggregated.totalInstallEventsDetected = aggregated.totalInstallCountByUser;
    aggregated.totalUninstallEventsDetected = aggregated.totalUninstallCountByUser;
    aggregated.totalDeviceUpgrades = aggregated.totalUpdateEventsDetected;
    aggregated.totalDailyUserInstalls = aggregated.totalInstallCountByUser;
    aggregated.totalDailyDeviceInstalls = aggregated.totalInstallCountByUser;
    aggregated.totalDailyUserUninstalls = aggregated.totalUninstallCountByUser;

    return { ...aggregated, dailyTrends, platform: 'apple', hasUninstallData: false };
  }

  async getDimensionStats(dimension, startDate, endDate) {
    const numericId = await this.getNumericAppId();
    const dateList = generateDateArray(startDate, endDate);
    const earliestIdx = await this.findEarliestDataDate(dateList);
    const activeDates = dateList.slice(earliestIdx);

    const dimensionMap = {
      'country': 'Country Code',
      'device': 'Device',
      'os_version': 'Supported Platforms',
      'app_version': 'Version'
    };
    const appleDim = dimensionMap[dimension] || dimension;

    const statsMap = new Map();

    const reports = await Promise.all(
      activeDates.map(async (dateStr) => {
        const rawTxt = await this.fetchDailySalesReport(dateStr);
        return { dateStr, rawTxt };
      })
    );

    for (const { dateStr, rawTxt } of reports) {
      if (!rawTxt || rawTxt === '__EMPTY__') continue;

      await new Promise((resolve) => {
        csv.parseString(rawTxt, { headers: true, delimiter: '\t' })
          .on('data', row => {
            const appleId = (row['Apple Identifier'] || '').trim();
            if (appleId !== String(numericId)) return;

            const label = row[appleDim] || 'Unknown';
            const units = parseInt(row['Units']) || 0;
            const productType = (row['Product Type Identifier'] || '').trim();

            if (!statsMap.has(label)) {
              statsMap.set(label, { label, activeDevices: 0, totalInstalls: 0, dailyUserInstalls: 0, dailyUserUninstalls: 0, netUserGrowth: 0, retentionRate: 0 });
            }

            const current = statsMap.get(label);
            if (FIRST_INSTALL_TYPES.has(productType)) {
              current.totalInstalls += units;
              current.dailyUserInstalls += units;
            }
          })
          .on('end', () => resolve());
      });
    }

    const results = Array.from(statsMap.values()).map(item => {
      item.netUserGrowth = item.dailyUserInstalls - item.dailyUserUninstalls;
      item.activeDevices = item.totalInstalls;
      item.retentionRate = item.totalInstalls > 0 ? 100 : 0;
      return item;
    });

    return results.sort((a, b) => b.totalInstalls - a.totalInstalls).slice(0, 15);
  }

  async listPackages() {
    try {
      const result = await resolver.resolve('packages', { platform: 'apple', issuerId: this.issuerId }, async () => {
        const token = this.generateToken();
        const url = `https://api.appstoreconnect.apple.com/v1/apps?fields[apps]=name,bundleId,sku`;
        const res = await axios.get(url, { headers: { 'Authorization': `Bearer ${token}` } });

        return res.data.data.map(app => ({
          name: app.attributes.name,
          packageName: app.attributes.bundleId,
          appId: app.id,
          bundleId: app.attributes.bundleId,
          platform: 'apple'
        }));
      });
      return result || [];
    } catch (error) {
      console.error("Error listing Apple apps:", error.message);
      return [];
    }
  }

  async getAppMetadata(identifier) {
    const target = identifier || this.appId || this.numericAppId;
    if (!target) return null;

    try {
      return await resolver.resolve('scrape:apple', { identifier: target }, async () => {
        const isNumeric = /^\d+$/.test(target);
        const url = isNumeric
          ? `https://itunes.apple.com/lookup?id=${target}`
          : `https://itunes.apple.com/lookup?bundleId=${target}`;
        
        const res = await axios.get(url);
        if (res.data && res.data.results && res.data.results.length > 0) {
          const item = res.data.results[0];
          return {
            title: item.trackName,
            iconUrl: item.artworkUrl512 || item.artworkUrl100 || item.artworkUrl60,
            summary: item.description ? item.description.substring(0, 200) + '...' : '',
            descriptionHTML: item.description,
            scoreText: item.averageUserRating ? item.averageUserRating.toFixed(1) : 'N/A',
            score: item.averageUserRating || 0,
            ratings: item.userRatingCount || 0,
            reviews: item.userRatingCount || 0,
            installs: 'N/A',
            minInstalls: 0,
            genre: item.primaryGenreName,
            developer: item.sellerName || item.artistName,
            developerId: item.artistId,
            developerWebsite: item.sellerUrl,
            priceText: item.formattedPrice || (item.price === 0 ? 'Free' : `$${item.price}`),
            free: item.price === 0,
            version: item.version,
            updated: item.currentVersionReleaseDate || item.releaseDate,
            url: item.trackViewUrl,
            adamId: item.trackId,
            bundleId: item.bundleId
          };
        }
        return null;
      });
    } catch (err) {
      console.warn(`[DEBUG] Could not fetch iTunes App Store metadata for ${target}:`, err.message);
      return null;
    }
  }
}

module.exports = AppleAppStoreStatsViewer;
