const GooglePlayStoreStatsViewer = require("./lib/GooglePlayStoreStatsViewer");
const AppleAppStoreStatsViewer = require("./lib/AppleAppStoreStatsViewer");
const { aggregateOverviews } = require("./lib/metrics");
const gplayModule = require("google-play-scraper");
const gplay = gplayModule.default || gplayModule;
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const getBaseConfig = () => {
  const configPath = process.env.CONFIG_PATH || path.join(__dirname, "..", "config", "config.json");
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.error("Error reading config.json:", error);
    return null;
  }
};

const copyRecursiveSync = (src, dest) => {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
};

const getScrapedPlayStoreData = async (appId) => {
  try {
    const details = await gplay.app({ appId });
    return {
      title: details.title,
      iconUrl: details.icon,
      summary: details.summary,
      descriptionHTML: details.descriptionHTML,
      scoreText: details.scoreText,
      score: details.score,
      ratings: details.ratings,
      reviews: details.reviews,
      installs: details.installs,
      minInstalls: details.minInstalls,
      genre: details.genre,
      developer: details.developer,
      developerId: details.developerId,
      developerEmail: details.developerEmail,
      developerWebsite: details.developerWebsite,
      priceText: details.priceText,
      free: details.free,
      version: details.version,
      updated: details.updated,
      url: details.url,
      appId: details.appId
    };
  } catch (err) {
    console.warn(`Could not scrape Play Store metadata for ${appId}:`, err.message);
    return null;
  }
};

const getScrapedAppleStoreData = async (identifier) => {
  try {
    const isNumeric = /^\d+$/.test(identifier);
    const url = isNumeric
      ? `https://itunes.apple.com/lookup?id=${identifier}`
      : `https://itunes.apple.com/lookup?bundleId=${identifier}`;

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
  } catch (err) {
    console.error(`Could not scrape App Store metadata for ${identifier}:`, err.message);
  }
  return null;
};

// aggregateOverviews function is now imported from lib/metrics.js

async function generate() {
  const args = process.argv.slice(2);
  const isDemo = args.includes("--demo");
  const noPass = args.includes("--no-pass");

  const configs = getBaseConfig();
  if (!configs) {
    console.error("No config.json found.");
    return;
  }

  const docsDir = path.join(__dirname, "..", "docs");
  const docsDataDir = path.join(docsDir, "data");

  if (!fs.existsSync(docsDataDir)) {
    fs.mkdirSync(docsDataDir, { recursive: true });
  }

  // Copy public files to docs
  console.log("Copying public files to docs...");
  const publicDir = path.join(__dirname, "public");
  copyRecursiveSync(publicDir, docsDir);

  // Write static config for frontend
  const staticConfig = {
    isStatic: true,
    isDemoMode: isDemo,
    noPass: noPass
  };
  fs.writeFileSync(path.join(docsDir, "static_config.json"), JSON.stringify(staticConfig, null, 2));

  const projectList = [];
  const googleOverviews = [];
  const appleOverviews = [];
  const dimensions = ["country", "os_version", "app_version", "device"];

  let gIndex = 0;
  let aIndex = 0;

  for (let i = 0; i < configs.length; i++) {
    const baseConfig = configs[i];
    const statsViewer = new GooglePlayStoreStatsViewer({
      keyFilePath: baseConfig.keyFilePath ? path.resolve(path.join(__dirname, "..", "config"), baseConfig.keyFilePath) : null,
      keyJson: baseConfig.keyJson,
      projectID: baseConfig.projectID,
      bucketName: baseConfig.bucketName,
      packageName: "dummy"
    });

    console.log(`Processing config ${i + 1}/${configs.length}...`);
    let packages = [];
    try {
      packages = await statsViewer.listPackages();
      const ignored = baseConfig.ignoredPackages || [];
      packages = packages.filter(p => !ignored.includes(p.packageName));
    } catch (err) {
      console.error(`Error listing packages for config ${i}:`, err.message);
      continue;
    }

    for (const pkg of packages) {
      console.log(`  Package (Google): ${pkg.packageName}`);
      const pkgDir = path.join(docsDataDir, pkg.packageName);
      if (!fs.existsSync(pkgDir)) {
        fs.mkdirSync(pkgDir, { recursive: true });
      }

      statsViewer.setPackageName(pkg.packageName);

      // Scraped metadata
      let storeDetails = await getScrapedPlayStoreData(pkg.packageName);
      if (storeDetails) {
        fs.writeFileSync(path.join(pkgDir, "store-details.json"), JSON.stringify(storeDetails, null, 2));
      }

      // 1. Overview Stats
      let overviewData = null;
      try {
        overviewData = await statsViewer.getAppStats();
        fs.writeFileSync(path.join(pkgDir, "overview.json"), JSON.stringify(overviewData, null, 2));
        console.log(`    Saved overview.json`);
      } catch (err) {
        console.error(`    Error getting overview for ${pkg.packageName}:`, err.message);
      }

      const metadata = baseConfig.appMetadata?.[pkg.packageName] || {};
      const name = metadata.displayName || storeDetails?.title || pkg.name || pkg.packageName;
      const storeUrl = metadata.storeUrl || storeDetails?.url || `https://play.google.com/store/apps/details?id=${pkg.packageName}`;
      const consoleBase = baseConfig.PlaystoreConsoleUrl
        ? baseConfig.PlaystoreConsoleUrl.replace(/\/+$/, '')
        : `https://play.google.com/console/u/0/developers/${metadata.developerConsoleId || baseConfig.developerConsoleId || '7018441398256771959'}`;
      const appId = metadata.consoleAppId || (pkg.packageName === 'io.github.zmsp.addaboard' ? '4976209752217554327' : null);
      const consoleUrl = metadata.consoleUrl || (appId ? `${consoleBase}/app/${appId}/app-dashboard` : consoleBase);
      const iconUrl = metadata.iconUrl || storeDetails?.iconUrl || `https://s2.googleusercontent.com/s2/favicons?domain=play.google.com&sz=128`;

      if (overviewData) {
        googleOverviews.push({ name, overview: overviewData });
      }

      // 2. Dimensions
      for (const dim of dimensions) {
        try {
          const dimData = await statsViewer.getDimensionStats(dim);
          fs.writeFileSync(path.join(pkgDir, `${dim}.json`), JSON.stringify(dimData, null, 2));
          console.log(`    Saved ${dim}.json`);
        } catch (err) {
          console.error(`    Error getting ${dim} for ${pkg.packageName}:`, err.message);
        }
      }

      projectList.push({
        index: `g-${gIndex++}`,
        name,
        platform: "google",
        packageName: pkg.packageName,
        storeUrl,
        consoleUrl,
        iconUrl,
        hasKey: true
      });
    }

    // Apple App Store Projects
    if (baseConfig.keyFilePath_apple) {
      try {
        const appleKeyPath = path.resolve(path.join(__dirname, "..", "config"), baseConfig.keyFilePath_apple);
        if (fs.existsSync(appleKeyPath)) {
          const privateKey = fs.readFileSync(appleKeyPath, "utf8");
          const appleViewer = new AppleAppStoreStatsViewer({
            issuerId: baseConfig.appleIssuerId,
            keyId: baseConfig.appleKeyId,
            vendorId: baseConfig.appleVendorId,
            privateKey: privateKey,
            dataDir: path.join(__dirname, "data")
          });

          const apps = await appleViewer.listPackages();
          for (const app of apps) {
            console.log(`  Apple App: ${app.packageName}`);
            const pkgDir = path.join(docsDataDir, app.packageName);
            if (!fs.existsSync(pkgDir)) {
              fs.mkdirSync(pkgDir, { recursive: true });
            }

            const appViewer = new AppleAppStoreStatsViewer({
              issuerId: baseConfig.appleIssuerId,
              keyId: baseConfig.appleKeyId,
              vendorId: baseConfig.appleVendorId,
              privateKey: privateKey,
              appId: app.packageName,
              dataDir: path.join(__dirname, "data")
            });

            // Scraped metadata
            let appleMeta = null;
            try {
              appleMeta = await appViewer.getAppMetadata(app.packageName);
              if (appleMeta) {
                fs.writeFileSync(path.join(pkgDir, "store-details.json"), JSON.stringify(appleMeta, null, 2));
              }
            } catch (e) {}

            // 1. Overview
            let overviewData = null;
            try {
              overviewData = await appViewer.getAppStats();
              fs.writeFileSync(path.join(pkgDir, "overview.json"), JSON.stringify(overviewData, null, 2));
              console.log(`    Saved overview.json`);
            } catch (err) {
              console.error(`    Error getting overview for ${app.packageName}:`, err.message);
            }

            const metadata = baseConfig.appMetadata?.[app.packageName || app.bundleId] || {};
            const storeUrl = metadata.storeUrl || appleMeta?.url || (app.adamId ? `https://apps.apple.com/app/id${app.adamId}` : null);
            const consoleUrl = metadata.consoleUrl || `https://appstoreconnect.apple.com/apps`;
            const iconUrl = metadata.iconUrl || appleMeta?.iconUrl || `https://s2.googleusercontent.com/s2/favicons?domain=apps.apple.com&sz=128`;
            const name = metadata.displayName || appleMeta?.title || `${app.name} (App Store)`;

            if (overviewData) {
              appleOverviews.push({ name, overview: overviewData });
            }

            // 2. Dimensions
            for (const dim of dimensions) {
              try {
                const dimData = await appViewer.getDimensionStats(dim);
                fs.writeFileSync(path.join(pkgDir, `${dim}.json`), JSON.stringify(dimData, null, 2));
                console.log(`    Saved ${dim}.json`);
              } catch (err) {
                console.error(`    Error getting ${dim} for ${app.packageName}:`, err.message);
              }
            }

            projectList.push({
              index: `a-${aIndex++}`,
              name,
              platform: "apple",
              packageName: app.packageName,
              bundleId: app.bundleId,
              sku: app.sku,
              storeUrl,
              consoleUrl,
              iconUrl,
              primaryLocale: app.primaryLocale,
              hasKey: true
            });
          }
        }
      } catch (error) {
        console.error("Error processing Apple projects for static export:", error.message);
      }
    }
  }

  // Generate Aggregated Overviews for "all_google" and "all_apple"
  if (googleOverviews.length > 0) {
    const allGoogleDir = path.join(docsDataDir, "all_google");
    if (!fs.existsSync(allGoogleDir)) fs.mkdirSync(allGoogleDir, { recursive: true });
    const aggregatedGoogle = aggregateOverviews(googleOverviews);
    if (aggregatedGoogle) {
      fs.writeFileSync(path.join(allGoogleDir, "overview.json"), JSON.stringify(aggregatedGoogle, null, 2));
      console.log("  Saved all_google/overview.json");
    }
    dimensions.forEach(dim => {
      fs.writeFileSync(path.join(allGoogleDir, `${dim}.json`), JSON.stringify([], null, 2));
    });
  }

  if (appleOverviews.length > 0) {
    const allAppleDir = path.join(docsDataDir, "all_apple");
    if (!fs.existsSync(allAppleDir)) fs.mkdirSync(allAppleDir, { recursive: true });
    const aggregatedApple = aggregateOverviews(appleOverviews);
    if (aggregatedApple) {
      fs.writeFileSync(path.join(allAppleDir, "overview.json"), JSON.stringify(aggregatedApple, null, 2));
      console.log("  Saved all_apple/overview.json");
    }
    dimensions.forEach(dim => {
      fs.writeFileSync(path.join(allAppleDir, `${dim}.json`), JSON.stringify([], null, 2));
    });
  }

  // Copy releases.json if available
  const releasesPath = path.join(__dirname, "data", "releases.json");
  if (fs.existsSync(releasesPath)) {
    fs.copyFileSync(releasesPath, path.join(docsDataDir, "releases.json"));
  } else {
    fs.writeFileSync(path.join(docsDataDir, "releases.json"), JSON.stringify([], null, 2));
  }

  // Copy or compile notes.json
  const notesPath = path.join(__dirname, "data", "notes.json");
  const notesDir = path.join(__dirname, "data", "notes");
  const exportedNotes = [];

  if (fs.existsSync(notesDir)) {
    try {
      const subdirs = fs.readdirSync(notesDir, { withFileTypes: true });
      for (const dirent of subdirs) {
        if (dirent.isDirectory()) {
          const pkgDir = path.join(notesDir, dirent.name);
          const files = fs.readdirSync(pkgDir);
          for (const file of files) {
            if (file.endsWith('.md')) {
              try {
                const raw = fs.readFileSync(path.join(pkgDir, file), 'utf8');
                const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
                const metadata = {};
                let content = raw;
                if (frontmatterMatch) {
                  content = frontmatterMatch[2];
                  frontmatterMatch[1].split(/\r?\n/).forEach(line => {
                    const colonIdx = line.indexOf(':');
                    if (colonIdx > 0) {
                      const key = line.slice(0, colonIdx).trim();
                      let val = line.slice(colonIdx + 1).trim();
                      if (val === 'true') val = true;
                      else if (val === 'false') val = false;
                      else if (val.startsWith('[') && val.endsWith(']')) {
                        try { val = JSON.parse(val); } catch (e) { val = []; }
                      } else if (val.startsWith('"') && val.endsWith('"')) { val = val.slice(1, -1); }
                      metadata[key] = val;
                    }
                  });
                }
                exportedNotes.push({
                  id: metadata.id || path.basename(file, '.md'),
                  title: metadata.title || 'Untitled Note',
                  packageName: metadata.packageName || dirent.name,
                  platform: metadata.platform || 'all',
                  tags: Array.isArray(metadata.tags) ? metadata.tags : [],
                  pinned: Boolean(metadata.pinned),
                  createdAt: metadata.createdAt || new Date().toISOString(),
                  updatedAt: metadata.updatedAt || new Date().toISOString(),
                  content
                });
              } catch (e) {}
            }
          }
        }
      }
    } catch (err) {
      console.error("Error building static notes data:", err);
    }
  }

  if (exportedNotes.length > 0) {
    fs.writeFileSync(path.join(docsDataDir, "notes.json"), JSON.stringify(exportedNotes, null, 2));
  } else if (fs.existsSync(notesPath)) {
    fs.copyFileSync(notesPath, path.join(docsDataDir, "notes.json"));
  } else {
    fs.writeFileSync(path.join(docsDataDir, "notes.json"), JSON.stringify([], null, 2));
  }

  fs.writeFileSync(path.join(docsDataDir, "projects.json"), JSON.stringify(projectList, null, 2));

  console.log("\nDone generating static data to 'docs/data' folder.");
}

generate().catch(err => {
  console.error("Fatal error:", err);
});
