const fs = require("fs");
const path = require("path");
const csv = require("@fast-csv/parse");
const { Storage } = require("@google-cloud/storage");
const util = require("util");

const InputParamsModel = require("./InputParamsModel");
const Dimensions = require("./Dimensions");
const resolver = require("./resolver");
const { db } = require("./db/index");

const readFilePromise = util.promisify(fs.readFile);

class GooglePlayStoreStatsViewer {
  constructor({ keyFilePath, keyJson, packageName, projectID, bucketName, dataDir }) {
    this.inputParamsModel = new InputParamsModel({
      keyFilePath,
      packageName,
      projectID,
      bucketName
    });
    this.keyJson = keyJson;
    this.packageUtils = new PackageUtils();
    this.Dimensions = Dimensions;
    this.dataDir = dataDir || path.join(process.cwd(), "data");
  }

  setPackageName(packageName) {
    this.inputParamsModel.packageName = packageName;
  }

  async initializeStorage() {
    let credentials;
    if (this.keyJson) {
      credentials = typeof this.keyJson === "string" ? JSON.parse(this.keyJson.replace(/^\uFEFF/, "").trim()) : this.keyJson;
    } else if (this.inputParamsModel.keyFilePath) {
      let fileContent = await readFilePromise(this.inputParamsModel.keyFilePath, "utf8");
      // Remove UTF-8 BOM if present and trim whitespace/trailing characters
      fileContent = fileContent.replace(/^\uFEFF/, "").trim();
      credentials = JSON.parse(fileContent);
    } else {
      throw new Error("Either keyFilePath or keyJson must be provided for authentication.");
    }

    if (credentials && credentials.quota_project_id) {
      delete credentials.quota_project_id;
    }

    await this.packageUtils.createAuthenticatedStorageObject({
      credentials,
      projectID: this.inputParamsModel.projectID
    });
  }

  async getAppStats(startDate, endDate, force = false) {
    const isForce = typeof force === 'object' ? Boolean(force.force || force.forceRefresh) : Boolean(force);
    if (isForce) {
      resolver.clearCache('gcs:filelist');
      resolver.clearCache('agg_cache');
    }
    await this.initializeStorage();

    const [files] = await this.packageUtils.getCorrectFiles({
      storage: this.packageUtils.authenticatedStorageObj,
      bucketName: this.inputParamsModel.bucketName,
      packageName: this.inputParamsModel.packageName
    });

    const [ratingFiles] = await this.packageUtils.getCorrectFiles({
      storage: this.packageUtils.authenticatedStorageObj,
      bucketName: this.inputParamsModel.bucketName,
      packageName: this.inputParamsModel.packageName,
      type: 'ratings'
    });

    const [vitalsCrashesFiles] = await this.packageUtils.getCorrectFiles({
      storage: this.packageUtils.authenticatedStorageObj,
      bucketName: this.inputParamsModel.bucketName,
      packageName: this.inputParamsModel.packageName,
      type: 'vitals_crashes'
    });

    const [vitalsAnrsFiles] = await this.packageUtils.getCorrectFiles({
      storage: this.packageUtils.authenticatedStorageObj,
      bucketName: this.inputParamsModel.bucketName,
      packageName: this.inputParamsModel.packageName,
      type: 'vitals_anrs'
    });

    const downloadDir = path.join(this.dataDir, 'download_stats', this.inputParamsModel.packageName);
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const cleanedFileNames = await this.packageUtils.downloadCsvFiles({
      storage: this.packageUtils.authenticatedStorageObj,
      bucketName: this.inputParamsModel.bucketName,
      packageName: this.inputParamsModel.packageName,
      files,
      dimension: 'overview',
      targetLocation: downloadDir,
      startDate,
      endDate,
      force: isForce
    });

    const cleanedRatingFiles = await this.packageUtils.downloadCsvFiles({
      storage: this.packageUtils.authenticatedStorageObj,
      bucketName: this.inputParamsModel.bucketName,
      packageName: this.inputParamsModel.packageName,
      files: ratingFiles,
      dimension: 'overview',
      type: 'ratings',
      targetLocation: downloadDir,
      startDate,
      endDate,
      force: isForce
    });

    const cleanedCrashFiles = await this.packageUtils.downloadCsvFiles({
      storage: this.packageUtils.authenticatedStorageObj,
      bucketName: this.inputParamsModel.bucketName,
      packageName: this.inputParamsModel.packageName,
      files: vitalsCrashesFiles,
      dimension: 'overview',
      type: 'vitals_crashes',
      targetLocation: downloadDir,
      startDate,
      endDate,
      force: isForce
    });

    const cleanedAnrFiles = await this.packageUtils.downloadCsvFiles({
      storage: this.packageUtils.authenticatedStorageObj,
      bucketName: this.inputParamsModel.bucketName,
      packageName: this.inputParamsModel.packageName,
      files: vitalsAnrsFiles,
      dimension: 'overview',
      type: 'vitals_anrs',
      targetLocation: downloadDir,
      startDate,
      endDate,
      force: isForce
    });

    console.log(`Downloaded ${cleanedFileNames.length} overview, ${cleanedRatingFiles.length} ratings, and ${cleanedCrashFiles.length + cleanedAnrFiles.length} vitals`);

    if (cleanedFileNames.length === 0) {
      throw new Error(`No overview reports found for package: ${this.inputParamsModel.packageName}`);
    }

    return this.packageUtils.findSumTotalOfValues({
      cleanedFileNames: [
        ...cleanedFileNames,
        ...cleanedRatingFiles.map(f => f.startsWith('ratings') ? f : 'ratings_' + f),
        ...cleanedCrashFiles.map(f => f.startsWith('vitals') ? f : 'vitals_' + f),
        ...cleanedAnrFiles.map(f => f.startsWith('vitals') ? f : 'vitals_' + f)
      ],
      packageName: this.inputParamsModel.packageName,
      targetLocation: downloadDir,
      startDate,
      endDate
    });
  }

  async getDimensionStats(dimension, startDate, endDate) {
    await this.initializeStorage();

    const [files] = await this.packageUtils.getCorrectFiles({
      storage: this.packageUtils.authenticatedStorageObj,
      bucketName: this.inputParamsModel.bucketName,
      packageName: this.inputParamsModel.packageName
    });

    const downloadDir = path.join(this.dataDir, 'download_stats', this.inputParamsModel.packageName);
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const downloaded = await this.packageUtils.downloadCsvFiles({
      storage: this.packageUtils.authenticatedStorageObj,
      bucketName: this.inputParamsModel.bucketName,
      packageName: this.inputParamsModel.packageName,
      files,
      dimension,
      targetLocation: downloadDir,
      startDate,
      endDate
    });

    if (downloaded.length === 0) {
      throw new Error(`No CSV report found for dimension: ${dimension}`);
    }

    const results = await Promise.all(downloaded.map(fileName => {
      const localFilePath = path.join(downloadDir, fileName);
      return this.packageUtils.parseDimensionFile(localFilePath, dimension, startDate, endDate);
    }));

    // Merge results from multiple files
    const mergedMap = new Map();
    results.flat().forEach(item => {
      if (!mergedMap.has(item.label)) {
        mergedMap.set(item.label, { ...item });
      } else {
        const existing = mergedMap.get(item.label);
        existing.activeDevices = Math.max(existing.activeDevices, item.activeDevices);
        existing.totalInstalls = Math.max(existing.totalInstalls, item.totalInstalls);
        existing.dailyUserInstalls += item.dailyUserInstalls;
        existing.dailyUserUninstalls += item.dailyUserUninstalls;
        existing.dailyDeviceInstalls += item.dailyDeviceInstalls;
        existing.dailyDeviceUninstalls += item.dailyDeviceUninstalls;
        existing.dailyDeviceUpgrades += item.dailyDeviceUpgrades;
        existing.installEvents += item.installEvents;
        existing.updateEvents += item.updateEvents;
        existing.uninstallEvents += item.uninstallEvents;
      }
    });

    const finalResults = Array.from(mergedMap.values()).map(item => {
      const netUserGrowth = item.dailyUserInstalls - item.dailyUserUninstalls;
      const retentionRate = item.totalInstalls > 0 ? (item.activeDevices / item.totalInstalls) * 100 : 0;
      return { ...item, netUserGrowth, retentionRate: parseFloat(retentionRate.toFixed(2)) };
    });

    return finalResults.sort((a, b) => b.activeDevices - a.activeDevices).slice(0, 20);
  }

  async listPackages() {
    try {
      await this.initializeStorage();
      const bucketName = this.inputParamsModel.bucketName;
      const fileNames = await resolver.resolve('packages', { platform: 'google', bucketName }, async () => {
        const [files] = await this.packageUtils.authenticatedStorageObj
          .bucket(bucketName)
          .getFiles({ prefix: "stats/installs/installs_" });
        return files.map(f => f.name);
      });

      const packages = new Set();
      const packageRegex = /^stats\/installs\/installs_(.+)_(\d{6})_(.+)\.csv$/;

      (fileNames || []).forEach(fileName => {
        const match = fileName.match(packageRegex);
        if (match) {
          packages.add(match[1]);
        }
      });

      return Array.from(packages).map(pkg => ({
        name: pkg.split(".").pop().split(/[_-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" "),
        packageName: pkg
      }));
    } catch (e) {
      console.error("Error listing packages:", e);
      throw e;
    }
  }
}

class PackageUtils {
  getHeaderIndexes(row) {
    const normalized = row.map(c => {
      let str = (c || '').toString().toLowerCase().trim();
      if (str.startsWith('\uFEFF')) str = str.substring(1);
      return str;
    });
    const labelCols = ['country', 'country / region', 'device', 'os version', 'android os version', 'app version', 'carrier', 'language'];
    return {
      date: normalized.findIndex(c => c === 'date'),
      label: normalized.findIndex(c => labelCols.includes(c)) !== -1
        ? normalized.findIndex(c => labelCols.includes(c))
        : 2,
      activeDevices: normalized.findIndex(c => c === 'active device installs'),
      totalInstalls: normalized.findIndex(c => c === 'total user installs'),
      dailyInstalls: normalized.findIndex(c => c === 'daily user installs'),
      dailyUninstalls: normalized.findIndex(c => c === 'daily user uninstalls'),
      dailyDeviceInstalls: normalized.findIndex(c => c === 'daily device installs'),
      dailyDeviceUninstalls: normalized.findIndex(c => c === 'daily device uninstalls'),
      installEvents: normalized.findIndex(c => c === 'install events'),
      uninstallEvents: normalized.findIndex(c => c === 'uninstall events'),
      updateEvents: normalized.findIndex(c => c === 'update events'),
      upgrades: normalized.findIndex(c => c === 'daily device upgrades')
    };
  }

  getRatingHeaderIndexes(row) {
    const normalized = row.map(c => {
      let str = (c || "").toString().toLowerCase().trim();
      if (str.startsWith('\ufeff')) str = str.substring(1);
      return str;
    });
    return {
      date: normalized.findIndex(c => c === 'date'),
      dailyAvgRating: normalized.findIndex(c => c === 'daily average rating' || c === 'daily_average_rating'),
      totalAvgRating: normalized.findIndex(c => c === 'total average rating' || c === 'total_average_rating'),
      star1: normalized.findIndex(c => c === '1-star ratings' || c === 'star_rating_1' || c === '1*'),
      star2: normalized.findIndex(c => c === '2-star ratings' || c === 'star_rating_2' || c === '2*'),
      star3: normalized.findIndex(c => c === '3-star ratings' || c === 'star_rating_3' || c === '3*'),
      star4: normalized.findIndex(c => c === '4-star ratings' || c === 'star_rating_4' || c === '4*'),
      star5: normalized.findIndex(c => c === '5-star ratings' || c === 'star_rating_5' || c === '5*'),
    };
  }

  getVitalsHeaderIndexes(row) {
    const normalized = row.map(c => {
      let str = (c || "").toString().toLowerCase().trim();
      if (str.startsWith('\ufeff')) str = str.substring(1);
      return str;
    });
    return {
      date: normalized.findIndex(c => c === 'date'),
      crashRate: normalized.findIndex(c => c === 'daily crash rate' || c === 'crash_rate' || c === 'distinct_cluster_crash_rate'),
      anrRate: normalized.findIndex(c => c === 'daily anr rate' || c === 'anr_rate' || c === 'distinct_cluster_anr_rate'),
    };
  }

  // Helper to read file with correct encoding (Google Play Console uses UTF-16LE)
  readFileContent(fileName) {
    const buffer = fs.readFileSync(fileName);
    // Check for UTF-16LE BOM (0xFF 0xFE)
    if (buffer[0] === 0xff && buffer[1] === 0xfe) {
      return buffer.toString('utf16le');
    }
    return buffer.toString('utf8');
  }

  async createAuthenticatedStorageObject({ credentials, projectID }) {
    if (this.authenticatedStorageObj) return;
    this.authenticatedStorageObj = new Storage({
      scopes: "https://www.googleapis.com/auth/devstorage.read_only",
      credentials,
      projectId: projectID
    });
  }

  async getCorrectFiles({ storage, bucketName, packageName, type = "installs" }) {
    let prefix = `stats/${type}/${type}_${packageName}_`;
    if (type === "vitals_crashes") {
      prefix = `stats/vitals/crashes/crashes_${packageName}_`;
    } else if (type === "vitals_anrs") {
      prefix = `stats/vitals/anrs/anrs_${packageName}_`;
    }

    const fileList = await resolver.resolve('gcs:filelist', { bucket: bucketName, prefix }, async () => {
      const [files] = await storage.bucket(bucketName).getFiles({ prefix });
      return files.map(f => ({ name: f.name }));
    });

    return [fileList];
  }

  async downloadCsvFiles({ storage, bucketName, packageName, files, dimension = "overview", type = "installs", targetLocation, startDate, endDate, force = false }) {
    const cleanedFileNames = [];
    const now = Date.now();
    const nowDate = new Date(now);
    const currentMonthStr = `${nowDate.getFullYear()}${String(nowDate.getMonth() + 1).padStart(2, '0')}`;

    let requiredMonths = [];
    if (startDate && endDate) {
      let start = new Date(startDate);
      let end = new Date(endDate);
      let current = new Date(start.getFullYear(), start.getMonth(), 1);
      while (current <= end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        requiredMonths.push(`${year}${month}`);
        current.setMonth(current.getMonth() + 1);
      }
    }

    const filePrefix = type !== "installs" ? `${type}_` : "";

    for (let file of files) {
      if (file.name && (file.name.endsWith(`_${dimension}.csv`) || file.name.endsWith(`_${dimension}_region.csv`))) {
        const match = file.name.match(/_(\d{6})_/);
        const fileMonth = match ? match[1] : null;

        let shouldDownload = false;
        if (requiredMonths.length > 0) {
          if (fileMonth) {
            if (requiredMonths.includes(fileMonth)) {
              shouldDownload = true;
            }
          } else {
            shouldDownload = true;
          }
        } else {
          shouldDownload = true;
        }

        if (shouldDownload) {
          const fixedFileName = fileMonth ? `${filePrefix}${dimension}_${fileMonth}.csv` : `${filePrefix}${dimension}.csv`;
          const dest = path.join(targetLocation, fixedFileName);

          const exists = fs.existsSync(dest);
          const isCurrentMonth = fileMonth === currentMonthStr;

          let needsRefetch = !exists || force;
          if (exists && isCurrentMonth) {
            const stat = fs.statSync(dest);
            const ageMs = now - stat.mtimeMs;
            if (ageMs > 3600 * 1000) { // 1 hour TTL for current month
              needsRefetch = true;
            } else if (ageMs > 300 * 1000) {
              const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
              try {
                const content = this.readFileContent(dest);
                if (!content.includes(twoDaysAgo)) {
                  console.log(`[GooglePlay] Current month CSV ${fixedFileName} is missing data for recent date ${twoDaysAgo}. Repulling...`);
                  needsRefetch = true;
                }
              } catch (e) {}
            }
          }

          if (needsRefetch) {
            console.log(`Downloading ${file.name} to ${dest}`);
            await storage.bucket(bucketName).file(file.name).download({ destination: dest });
          }
          cleanedFileNames.push(fixedFileName);

          if (db && fileMonth) {
            try {
              let appRow = db.prepare('SELECT id FROM app WHERE package_name = ? AND platform = ?').get(packageName, 'google');
              if (!appRow) {
                const res = db.prepare('INSERT INTO app (package_name, platform) VALUES (?, ?)').run(packageName, 'google');
                appRow = { id: res.lastInsertRowid };
              }
              const monthStart = `${fileMonth.substring(0, 4)}-${fileMonth.substring(4, 6)}-01`;
              const monthEnd = `${fileMonth.substring(0, 4)}-${fileMonth.substring(4, 6)}-31`;
              db.prepare(`
                INSERT OR REPLACE INTO coverage_index (app_id, resource, start_date, end_date, file_month, fetched_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
              `).run(appRow.id, dimension, monthStart, monthEnd, fileMonth);

              if (dimension === 'overview' && fs.existsSync(dest)) {
                const { ingestGoogleOverview, updateAppDates, getChecksum } = require('./db/ingest');
                const stat = fs.statSync(dest);
                const checksum = getChecksum(dest);
                await ingestGoogleOverview(dest, fileMonth, appRow.id, stat, checksum);
                await updateAppDates(appRow.id);
              }
            } catch (e) {
              console.error(`[GooglePlay] DB ingestion error for ${fixedFileName}:`, e.message);
            }
          }
        }
      }
    }

    if (cleanedFileNames.length === 0 && fs.existsSync(targetLocation)) {
      const localFiles = fs.readdirSync(targetLocation);
      const matches = localFiles.filter(f => f.startsWith(`${filePrefix}${dimension}_`) || f === `${filePrefix}${dimension}.csv`);
      if (matches.length > 0) {
        console.log(`No new files found in bucket for ${dimension}, but found ${matches.length} local files. Using them.`);
        cleanedFileNames.push(...matches);
      }
    }

    if (cleanedFileNames.length === 0) {
      for (let i = files.length - 1; i >= 0; i--) {
        let file = files[i];
        if (file.name && file.name.endsWith(`_${dimension}.csv`)) {
          const match = file.name.match(/_(\d{6})_/);
          const fileMonth = match ? match[1] : null;
          const fixedFileName = fileMonth ? `${filePrefix}${dimension}_${fileMonth}.csv` : `${filePrefix}${dimension}.csv`;
          const dest = path.join(targetLocation, fixedFileName);

          const exists = fs.existsSync(dest);
          const isCurrentMonth = fileMonth === currentMonthStr;

          let needsRefetch = !exists;
          if (exists && isCurrentMonth) {
            const stat = fs.statSync(dest);
            if (now - stat.mtimeMs > 3600 * 1000) {
              needsRefetch = true;
            }
          }

          if (needsRefetch) {
            console.log(`Downloading latest ${file.name} to ${dest}`);
            await storage.bucket(bucketName).file(file.name).download({ destination: dest });
          } else {
            console.log(`Using cached latest file: ${fixedFileName}`);
          }
          cleanedFileNames.push(fixedFileName);
          break;
        }
      }
    }

    return cleanedFileNames;
  }

  async findSumTotalOfValues({ cleanedFileNames, packageName, targetLocation, startDate, endDate }) {
    let sumPromises = [];
    cleanedFileNames.forEach(fileName => {
      const localPath = path.join(targetLocation, fileName);
      if (fileName.startsWith('overview')) {
        sumPromises.push(this.getTotals(localPath, startDate, endDate));
      }
    });

    const individualTotals = await Promise.all(sumPromises);

    // For daily trends, we want to combine all trends from all files and then filter by date
    let allTrends = [];
    for (const fileName of cleanedFileNames) {
      if (!fileName.startsWith('overview')) continue;
      const localPath = path.join(targetLocation, fileName);
      const trends = await this.getDailyTrends(localPath, startDate, endDate);
      allTrends = allTrends.concat(trends);
    }

    // Process Ratings if files exist
    let ratingTrends = [];
    let ratingsDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let averageRating = 0;

    for (const fileName of cleanedFileNames) {
      if (!fileName.startsWith('ratings')) continue;
      const localPath = path.join(targetLocation, fileName);
      const ratings = await this.getRatingTrends(localPath, startDate, endDate);
      ratingTrends = ratingTrends.concat(ratings);
    }

    let vitalsTrends = [];
    for (const fileName of cleanedFileNames) {
      if (!fileName.startsWith('vitals')) continue;
      const localPath = path.join(targetLocation, fileName);
      const vitals = await this.getVitalsTrends(localPath, startDate, endDate);
      vitalsTrends = vitalsTrends.concat(vitals);
    }

    // Sort and aggregate trends by date
    const trendsMap = new Map();
    allTrends.forEach(t => {
      const existing = trendsMap.get(t.date);
      if (existing) {
        existing.activeDevices = Math.max(existing.activeDevices, t.activeDevices || 0);
        existing.dailyInstalls += (t.dailyInstalls || 0);
        existing.dailyUninstalls += (t.dailyUninstalls || 0);
        existing.upgrades += (t.upgrades || 0);
        existing.dailyDeviceInstalls += (t.dailyDeviceInstalls || 0);
        existing.dailyUserInstalls += (t.dailyUserInstalls || 0);
        existing.dailyUserUninstalls += (t.dailyUserUninstalls || 0);
        existing.netGrowth = existing.dailyInstalls - existing.dailyUninstalls;
      } else {
        trendsMap.set(t.date, { ...t });
      }
    });
    const uniqueTrends = Array.from(trendsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Merge ratings into uniqueTrends
    if (ratingTrends.length > 0) {
      ratingTrends.sort((a, b) => a.date.localeCompare(b.date));
      const ratingMap = new Map(ratingTrends.map(r => [r.date, r]));

      uniqueTrends.forEach(trend => {
        const r = ratingMap.get(trend.date);
        if (r) {
          trend.dailyAvgRating = r.dailyAvgRating;
          trend.totalAvgRating = r.totalAvgRating;
          trend.ratingsDistribution = r.ratingsDistribution;
        }
      });

      const latestRating = ratingTrends[ratingTrends.length - 1];
      averageRating = latestRating.totalAvgRating;
      ratingsDistribution = latestRating.ratingsDistribution;
    }

    if (vitalsTrends.length > 0) {
      vitalsTrends.sort((a, b) => a.date.localeCompare(b.date));
      const vitalsMap = new Map();
      vitalsTrends.forEach(v => {
        if (!vitalsMap.has(v.date)) {
          vitalsMap.set(v.date, { ...v });
        } else {
          const existing = vitalsMap.get(v.date);
          if (v.crashRate > 0) existing.crashRate = v.crashRate;
          if (v.anrRate > 0) existing.anrRate = v.anrRate;
        }
      });
      uniqueTrends.forEach(trend => {
        const v = vitalsMap.get(trend.date);
        if (v) {
          trend.crashRate = v.crashRate;
          trend.anrRate = v.anrRate;
        }
      });
    }

    const aggregated = individualTotals.reduce(
      (accum, element) => {
        accum.totalInstallCountByUser = Math.max(accum.totalInstallCountByUser, element.totalInstallCountByUser);
        accum.totalUninstallCountByUser += element.totalUninstallCountByUser;
        accum.totalInstallEventsDetected += element.totalInstallEventsDetected;
        accum.totalUninstallEventsDetected += element.totalUninstallEventsDetected;
        accum.totalUpdateEventsDetected += element.totalUpdateEventsDetected;
        accum.totalDeviceUpgrades += element.totalDeviceUpgrades;
        accum.totalDailyDeviceInstalls += element.totalDailyDeviceInstalls || 0;
        accum.totalDailyUserInstalls += element.totalDailyUserInstalls || 0;
        accum.totalDailyUserUninstalls += element.totalDailyUserUninstalls || 0;
        return accum;
      },
      {
        totalInstallCountByUser: 0,
        totalUninstallCountByUser: 0,
        totalInstallEventsDetected: 0,
        totalUninstallEventsDetected: 0,
        totalUpdateEventsDetected: 0,
        totalDeviceUpgrades: 0,
        totalDailyDeviceInstalls: 0,
        totalDailyUserInstalls: 0,
        totalDailyUserUninstalls: 0
      }
    );

    const currentlyActiveDevices = uniqueTrends.length > 0 ? uniqueTrends[uniqueTrends.length - 1].activeDevices : 0;

    const result = {
      currentlyActiveDevices,
      averageRating,
      ratingsDistribution,
      dailyTrends: uniqueTrends,
      platform: 'google',
      hasUninstallData: true,
      ...aggregated
    };

    if (process.env.USE_DB === '1') {
      try {
        const { sqlRollup } = require('./db/read');
        const { getOrCompute } = require('./db/cache');
        
        const req = {
          kind: 'stats',
          appIds: [this.inputParamsModel.packageName],
          startDate,
          endDate
        };
        
        const dbResult = await getOrCompute(req, () => sqlRollup(this.inputParamsModel.packageName, startDate, endDate));
        
        if (dbResult) {
           console.log("Serving from DB layer");
           return dbResult;
        }
      } catch (err) {
        console.error("DB Rollup Error:", err);
      }
    }

    return result;
  }

  getRatingTrends(fileName, startDate, endDate) {
    return new Promise((resolve, reject) => {
      const trends = [];
      let headers = null;

      const content = this.readFileContent(fileName);
      csv.parseString(content)
        .on("error", error => reject(error))
        .on("data", row => {
          if (!headers) {
            headers = this.getRatingHeaderIndexes(row);
            return;
          }

          const date = row[headers.date];
          if (date) {
            const formattedDate = date.includes('-') ? date : `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
            if (startDate && formattedDate < startDate) return;
            if (endDate && formattedDate > endDate) return;

            trends.push({
              date: formattedDate,
              dailyAvgRating: headers.dailyAvgRating !== -1 ? parseFloat(row[headers.dailyAvgRating]) : 0,
              totalAvgRating: headers.totalAvgRating !== -1 ? parseFloat(row[headers.totalAvgRating]) : 0,
              ratingsDistribution: {
                1: headers.star1 !== -1 ? getParsedInt(row[headers.star1]) : 0,
                2: headers.star2 !== -1 ? getParsedInt(row[headers.star2]) : 0,
                3: headers.star3 !== -1 ? getParsedInt(row[headers.star3]) : 0,
                4: headers.star4 !== -1 ? getParsedInt(row[headers.star4]) : 0,
                5: headers.star5 !== -1 ? getParsedInt(row[headers.star5]) : 0,
              }
            });
          }
        })
        .on("end", () => {
          resolve(trends);
        });
    });
  }

  getVitalsTrends(fileName, startDate, endDate) {
    return new Promise((resolve, reject) => {
      const trends = [];
      let headers = null;

      const content = this.readFileContent(fileName);
      csv.parseString(content)
        .on("error", error => reject(error))
        .on("data", row => {
          if (!headers) {
            headers = this.getVitalsHeaderIndexes(row);
            return;
          }

          const date = row[headers.date];
          if (date) {
            const formattedDate = date.includes('-') ? date : `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
            if (startDate && formattedDate < startDate) return;
            if (endDate && formattedDate > endDate) return;

            trends.push({
              date: formattedDate,
              crashRate: headers.crashRate !== -1 ? parseNumeric(row[headers.crashRate]) : null,
              anrRate: headers.anrRate !== -1 ? parseNumeric(row[headers.anrRate]) : null,
            });
          }
        })
        .on("end", () => {
          resolve(trends);
        });
    });
  }

  getTotals(fileName, startDate, endDate) {
    return new Promise((resolve, reject) => {
      let totalInstallCountByUser = 0;
      let totalUninstallCountByUser = 0;
      let totalInstallEventsDetected = 0;
      let totalUninstallEventsDetected = 0;
      let totalUpdateEventsDetected = 0;
      let totalDeviceUpgrades = 0;
      let totalDailyDeviceInstalls = 0;
      let totalDailyUserInstalls = 0;
      let totalDailyUserUninstalls = 0;
      let headers = null;

      const content = this.readFileContent(fileName);
      csv.parseString(content)
        .on("error", error => reject(error))
        .on("data", row => {
          if (!headers) {
            headers = this.getHeaderIndexes(row);
            return;
          }

          const date = row[headers.date];
          if (date) {
            const formattedDate = date.includes('-') ? date : `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
            if (startDate && formattedDate < startDate) return;
            if (endDate && formattedDate > endDate) return;

            // Use Daily User Installs for cumulative totals if available (Total Conversion Velocity)
            if (headers.dailyInstalls !== -1) {
              const daily = getParsedInt(row[headers.dailyInstalls]);
              totalDailyUserInstalls += daily;
              totalInstallCountByUser += daily;
            } else if (headers.totalInstalls !== -1) {
              const cumulative = getParsedInt(row[headers.totalInstalls]);
              if (cumulative > totalInstallCountByUser) {
                totalInstallCountByUser = cumulative;
              }
            }

            if (headers.dailyUninstalls !== -1) {
              const dailyUn = getParsedInt(row[headers.dailyUninstalls]);
              totalDailyUserUninstalls += dailyUn;
              totalUninstallCountByUser += dailyUn;
            }

            totalDeviceUpgrades += headers.upgrades !== -1 ? getParsedInt(row[headers.upgrades]) : 0;

            const installs = (headers.installEvents !== -1 ? getParsedInt(row[headers.installEvents]) : 0) || (headers.dailyInstalls !== -1 ? getParsedInt(row[headers.dailyInstalls]) : 0);
            totalInstallEventsDetected += installs;

            totalUpdateEventsDetected += headers.updateEvents !== -1 ? getParsedInt(row[headers.updateEvents]) : (headers.upgrades !== -1 ? getParsedInt(row[headers.upgrades]) : 0);

            const uninstalls = (headers.uninstallEvents !== -1 ? getParsedInt(row[headers.uninstallEvents]) : 0) || (headers.dailyUninstalls !== -1 ? getParsedInt(row[headers.dailyUninstalls]) : 0);
            totalUninstallEventsDetected += uninstalls;

            totalDailyDeviceInstalls += headers.dailyDeviceInstalls !== -1 ? getParsedInt(row[headers.dailyDeviceInstalls]) : 0;
          }
        })
        .on("end", () => {
          resolve({
            totalInstallCountByUser,
            totalUninstallCountByUser,
            totalInstallEventsDetected: totalInstallCountByUser || totalInstallEventsDetected,
            totalUninstallEventsDetected: totalUninstallCountByUser || totalUninstallEventsDetected,
            totalUpdateEventsDetected,
            totalDeviceUpgrades,
            totalDailyDeviceInstalls,
            totalDailyUserInstalls,
            totalDailyUserUninstalls
          });
        });
    });
  }

  getDailyTrends(fileName, startDate, endDate) {
    return new Promise((resolve, reject) => {
      const trends = [];
      let headers = null;

      const content = this.readFileContent(fileName);
      csv.parseString(content)
        .on("error", error => reject(error))
        .on("data", row => {
          if (!headers) {
            headers = this.getHeaderIndexes(row);
            return;
          }

          const date = row[headers.date];
          if (date) {
            const formattedDate = date.includes('-') ? date : `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
            if (startDate && formattedDate < startDate) return;
            if (endDate && formattedDate > endDate) return;

            const dailyInstalls = (headers.installEvents !== -1 ? getParsedInt(row[headers.installEvents]) : 0) || (headers.dailyInstalls !== -1 ? getParsedInt(row[headers.dailyInstalls]) : 0);
            const dailyUninstalls = (headers.uninstallEvents !== -1 ? getParsedInt(row[headers.uninstallEvents]) : 0) || (headers.dailyUninstalls !== -1 ? getParsedInt(row[headers.dailyUninstalls]) : 0);
            const activeDevices = headers.activeDevices !== -1 ? getParsedInt(row[headers.activeDevices]) : 0;
            const upgrades = headers.upgrades !== -1 ? getParsedInt(row[headers.upgrades]) : 0;
            const dailyDeviceInstalls = headers.dailyDeviceInstalls !== -1 ? getParsedInt(row[headers.dailyDeviceInstalls]) : 0;
            const dailyUserInstalls = headers.dailyInstalls !== -1 ? getParsedInt(row[headers.dailyInstalls]) : 0;
            const dailyUserUninstalls = headers.dailyUninstalls !== -1 ? getParsedInt(row[headers.dailyUninstalls]) : 0;

            trends.push({
              date: formattedDate,
              activeDevices,
              dailyInstalls,
              dailyUninstalls,
              upgrades,
              dailyDeviceInstalls,
              dailyUserInstalls,
              dailyUserUninstalls,
              netGrowth: dailyInstalls - dailyUninstalls
            });
          }
        })
        .on("end", () => {
          console.log(`Parsed ${trends.length} trend entries from ${fileName}`);
          resolve(trends);
        });
    });
  }

  parseDimensionFile(fileName, dimensionType, startDate, endDate) {
    return new Promise((resolve, reject) => {
      const statsMap = new Map();
      let headers = null;

      const content = this.readFileContent(fileName);
      csv.parseString(content)
        .on("error", error => reject(error))
        .on("data", row => {
          if (!headers) {
            headers = this.getHeaderIndexes(row);
            return;
          }
          const date = row[headers.date];
          if (date) {
            const formattedDate = date.includes('-') ? date : `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
            if (startDate && formattedDate < startDate) return;
            if (endDate && formattedDate > endDate) return;

            const label = row[headers.label];
            const dailyInstalls = headers.dailyInstalls !== -1 ? getParsedInt(row[headers.dailyInstalls]) : 0;
            const activeDevices = headers.activeDevices !== -1 ? getParsedInt(row[headers.activeDevices]) : 0;

            const totalInstalls = headers.totalInstalls !== -1 ? getParsedInt(row[headers.totalInstalls]) : 0;
            const dailyUserInstalls = headers.dailyInstalls !== -1 ? getParsedInt(row[headers.dailyInstalls]) : 0;
            const dailyUserUninstalls = headers.dailyUninstalls !== -1 ? getParsedInt(row[headers.dailyUninstalls]) : 0;

            const installEvents = headers.installEvents !== -1 ? getParsedInt(row[headers.installEvents]) : 0;
            const updateEvents = headers.updateEvents !== -1 ? getParsedInt(row[headers.updateEvents]) : 0;
            const uninstallEvents = headers.uninstallEvents !== -1 ? getParsedInt(row[headers.uninstallEvents]) : 0;

            if (label && label.trim() !== "") {
              const current = statsMap.get(label) || {
                label,
                activeDevices: 0,
                totalInstalls: 0,
                dailyUserInstalls: 0,
                dailyUserUninstalls: 0,
                installEvents: 0,
                updateEvents: 0,
                uninstallEvents: 0
              };

              current.activeDevices = activeDevices; // Capture latest snapshot
              current.totalInstalls += dailyInstalls; // Accumulate daily installs for total period
              current.dailyUserInstalls += dailyUserInstalls || installEvents;
              current.dailyUserUninstalls += dailyUserUninstalls || uninstallEvents;
              current.installEvents += installEvents;
              current.updateEvents += updateEvents;
              current.uninstallEvents += uninstallEvents;

              statsMap.set(label, current);
            }
          }
        })
        .on("end", () => {
          const results = Array.from(statsMap.values())
            .sort((a, b) => b.activeDevices - a.activeDevices)
            .slice(0, 15);
          resolve(results);
        });
    });
  }
}

const parseNumeric = data => {
  if (data === undefined || data === null || data === '' || data === 'NA') return null;
  const num = Number(data);
  return isNaN(num) ? null : num;
};

const getParsedInt = data => {
  if (!data) return 0;
  try {
    data = data.toString().replace(/[^0-9]/g, "");
    data = parseInt(data);
  } catch (e) {
    data = 0;
  }
  return data || 0;
};

module.exports = GooglePlayStoreStatsViewer;
