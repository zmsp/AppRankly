const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const rateLimit = require('express-rate-limit');
const axios = require("axios");
const GooglePlayStoreStatsViewer = require("./lib/GooglePlayStoreStatsViewer");
const AppleAppStoreStatsViewer = require("./lib/AppleAppStoreStatsViewer");
const { aggregateOverviews } = require("./lib/metrics");

const app = express();
const PORT = process.env.PORT || 3000;
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error("FATAL: JWT_SECRET env var is not set. Refusing to start in production.");
    process.exit(1);
  } else {
    console.warn("WARNING: JWT_SECRET not set. Using insecure fallback for development.");
    JWT_SECRET = "dev-insecure-secret-key";
  }
}
const DATA_DIR = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? path.join(__dirname, "data") : path.join(__dirname, "..", "data"));

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const PASSWORD_FILE = path.join(DATA_DIR, ".admin_password");
const RELEASES_FILE = path.join(DATA_DIR, "releases.json");

// Secure headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for local dash if it interferes with charts/scripts, or configure properly
}));

// Restricted CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : "*",
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json({ limit: "10mb" }));

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // increased for dev
  message: { error: "Too many requests from this IP, please try again after 15 minutes" }
});
app.use('/api/auth', authLimiter);

// --- Authentication Logic ---

const isPasswordSet = () => {
  return fs.existsSync(PASSWORD_FILE) || process.env.ADMIN_PASSWORD;
};

// Check if setup is needed
app.get("/api/auth/status", (req, res) => {
  res.json({ setupRequired: !isPasswordSet() });
});

// Initial Setup / Create Password
app.post("/api/auth/setup", (req, res) => {
  if (isPasswordSet()) {
    return res.status(400).json({ error: "Setup already completed" });
  }

  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  fs.writeFileSync(PASSWORD_FILE, hash);

  res.json({ success: true });
});

// Login
app.post("/api/auth/login", (req, res) => {
  const { password } = req.body;
  let storedHash = process.env.ADMIN_PASSWORD;

  if (!storedHash && fs.existsSync(PASSWORD_FILE)) {
    storedHash = fs.readFileSync(PASSWORD_FILE, "utf8").trim();
  }

  if (!storedHash) {
    return res.status(500).json({ error: "Authentication not configured" });
  }

  const isValid = bcrypt.compareSync(password, storedHash);
  if (isValid) {
    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token });
  } else {
    res.status(401).json({ error: "Invalid password" });
  }
});

// Auth Middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authentication token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// --- Protected Endpoints ---

// Helper to read and parse config.json dynamically
const configFilePath = process.env.CONFIG_PATH || path.join(DATA_DIR, "config.json");

// Fallback to legacy config location if not in data dir
const getActualConfigPath = () => {
  const defaultPath = configFilePath;
  if (fs.existsSync(defaultPath)) {
    console.log(`Config found at default path: ${defaultPath}`);
    return defaultPath;
  }
  const dataConfigPath = path.join(DATA_DIR, "config", "config.json");
  if (fs.existsSync(dataConfigPath)) {
    console.log(`Config found at data/config path: ${dataConfigPath}`);
    return dataConfigPath;
  }
  const legacyPath = path.join(__dirname, "..", "config", "config.json");
  if (fs.existsSync(legacyPath)) {
    console.log(`Config found at legacy path: ${legacyPath}`);
    return legacyPath;
  }
  const appConfigPath = path.join(__dirname, "config", "config.json");
  if (fs.existsSync(appConfigPath)) {
    console.log(`Config found at app config path: ${appConfigPath}`);
    return appConfigPath;
  }
  console.warn(`No config file found! Tried: ${defaultPath}, ${dataConfigPath}, ${legacyPath}, ${appConfigPath}`);
  return defaultPath;
};

const getBaseConfig = () => {
  const activePath = getActualConfigPath();
  if (!fs.existsSync(activePath)) {
    return null;
  }
  try {
    const rawData = fs.readFileSync(activePath, "utf8");
    const parsed = JSON.parse(rawData);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch (error) {
    console.error("Critical configuration failure:", error.message);
    return null;
  }
};

// Helper to resolve relative/absolute key file path - SANITIZED
const resolveKeyFilePath = (keyPath) => {
  if (!keyPath) return null;

  const activeConfigDir = path.dirname(getActualConfigPath());
  const searchDirs = [
    activeConfigDir,
    path.join(activeConfigDir, "keys"),
    DATA_DIR,
    path.join(DATA_DIR, "config"),
    path.join(DATA_DIR, "config", "keys"),
    path.dirname(DATA_DIR),
    path.join(path.dirname(DATA_DIR), "config"),
    path.join(__dirname, "..", "config"),
    path.join(__dirname, "config")
  ];

  console.log(`Resolving key path for: ${keyPath}`);
  for (const baseDir of searchDirs) {
    const resolvedPath = path.isAbsolute(keyPath) ? keyPath : path.join(baseDir, keyPath);
    console.log(`Checking: ${resolvedPath}`);
    if (fs.existsSync(resolvedPath)) {
       // Security check: ensure it's within one of our allowed dirs
       const relativeToData = path.relative(DATA_DIR, resolvedPath);
       const relativeToConfig = path.relative(path.join(__dirname, "..", "config"), resolvedPath);
       const relativeToAppConfig = path.relative(path.join(__dirname, "config"), resolvedPath);
       const relativeToActiveConfig = path.relative(activeConfigDir, resolvedPath);

       const isSafe = (relativeToData && !relativeToData.startsWith('..')) ||
                      (relativeToConfig && !relativeToConfig.startsWith('..')) ||
                      (relativeToAppConfig && !relativeToAppConfig.startsWith('..')) ||
                      (relativeToActiveConfig && !relativeToActiveConfig.startsWith('..'));

       if (isSafe) {
         console.log(`Found safe key at: ${resolvedPath}`);
         return resolvedPath;
       }

       console.warn(`Attempted access to potentially unsafe path: ${keyPath} (resolved to ${resolvedPath})`);
    }
  }

  console.error(`Key file not found: ${keyPath}`);
  return null;
};

const gplayModule = require("google-play-scraper");
const gplay = gplayModule.default || gplayModule;

const PLAYSTORE_CACHE_FILE = path.join(DATA_DIR, "playstore_scrape_cache.json");
const APPSTORE_CACHE_FILE = path.join(DATA_DIR, "appstore_scrape_cache.json");

const getScrapedAppleStoreData = async (identifier) => {
  let cache = {};
  try {
    if (fs.existsSync(APPSTORE_CACHE_FILE)) {
      cache = JSON.parse(fs.readFileSync(APPSTORE_CACHE_FILE, "utf8"));
    }
  } catch (e) {
    cache = {};
  }

  const cached = cache[identifier];
  if (cached && cached.data) {
    return cached.data;
  }

  try {
    const isNumeric = /^\d+$/.test(identifier);
    const url = isNumeric
      ? `https://itunes.apple.com/lookup?id=${identifier}`
      : `https://itunes.apple.com/lookup?bundleId=${identifier}`;

    const res = await axios.get(url);
    if (res.data && res.data.results && res.data.results.length > 0) {
      const item = res.data.results[0];
      const scraped = {
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
      cache[identifier] = { timestamp: Date.now(), data: scraped };
      fs.writeFileSync(APPSTORE_CACHE_FILE, JSON.stringify(cache, null, 2));
      return scraped;
    }
  } catch (err) {
    console.error(`Could not scrape App Store metadata for ${identifier}:`, err.message);
  }
  return null;
};

const getScrapedPlayStoreData = async (appId) => {
  let cache = {};
  try {
    if (fs.existsSync(PLAYSTORE_CACHE_FILE)) {
      cache = JSON.parse(fs.readFileSync(PLAYSTORE_CACHE_FILE, "utf8"));
    }
  } catch (e) {
    cache = {};
  }

  // Use cache if exists
  const cached = cache[appId];
  if (cached && cached.data) {
    return cached.data;
  }

  try {
    const data = await gplay.app({ appId });
    const scraped = {
      title: data.title,
      iconUrl: data.icon,
      summary: data.summary,
      descriptionHTML: data.descriptionHTML || data.description,
      scoreText: data.scoreText,
      score: data.score,
      ratings: data.ratings,
      reviews: data.reviews,
      installs: data.installs,
      minInstalls: data.minInstalls,
      genre: data.genre,
      developer: data.developer,
      developerId: data.developerId,
      developerEmail: data.developerEmail,
      developerWebsite: data.developerWebsite,
      priceText: data.priceText,
      free: data.free,
      version: data.version,
      updated: data.updated,
      url: data.url
    };
    cache[appId] = { timestamp: Date.now(), data: scraped };
    fs.writeFileSync(PLAYSTORE_CACHE_FILE, JSON.stringify(cache, null, 2));
    return scraped;
  } catch (err) {
    console.warn(`Could not scrape Play Store metadata for ${appId}:`, err.message);
    return null;
  }
};

// Endpoint to fetch store details on-demand via scraper
app.post("/api/store-details", authenticate, async (req, res) => {
  const { packageName, platform, cacheOnly } = req.body;
  if (!packageName) {
    return res.status(400).json({ error: "packageName is required" });
  }

  const isApple = platform === "apple";

  if (isApple) {
    let cache = {};
    try {
      if (fs.existsSync(APPSTORE_CACHE_FILE)) {
        cache = JSON.parse(fs.readFileSync(APPSTORE_CACHE_FILE, "utf8"));
      }
    } catch (e) {}

    const cached = cache[packageName];
    if (cacheOnly) {
      if (cached && cached.data) {
        return res.json({ ...cached.data, isCached: true });
      }
      return res.json(null);
    }

    const scraped = await getScrapedAppleStoreData(packageName);
    if (!scraped) {
      return res.status(404).json({ error: "Failed to scrape Apple store details" });
    }
    return res.json({ ...scraped, isCached: false });
  }

  let cache = {};
  try {
    if (fs.existsSync(PLAYSTORE_CACHE_FILE)) {
      cache = JSON.parse(fs.readFileSync(PLAYSTORE_CACHE_FILE, "utf8"));
    }
  } catch (e) {}

  const cached = cache[packageName];
  if (cacheOnly) {
    if (cached && cached.data) {
      return res.json({ ...cached.data, isCached: true });
    }
    return res.json(null);
  }

  let scraped = await getScrapedPlayStoreData(packageName);
  if (!scraped) {
    // Fallback attempt with Apple metadata
    scraped = await getScrapedAppleStoreData(packageName);
  }

  if (!scraped) {
    return res.status(404).json({ error: "Failed to scrape store details" });
  }

  res.json({ ...scraped, isCached: false });
});

// Helper to resolve project configuration - SANITIZED
const getProjectConfig = (body) => {
  const baseConfig = getBaseConfig();

  // ONLY allow keys from config.json, NOT from request body for file paths
  return {
    projectID: baseConfig?.projectID,
    packageName: body.packageName,
    bucketName: baseConfig?.bucketName,
    keyJson: baseConfig?.keyJson, // Inline JSON is okay as it's not a file path
    keyFilePath: resolveKeyFilePath(baseConfig?.keyFilePath)
  };
};

// Basic status / health check endpoint (Public)
app.get("/api/status", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Endpoint to fetch integrations status (Sanitized)
app.get("/api/integrations/status", authenticate, (req, res) => {
  const baseConfig = getBaseConfig();
  res.json({
    google: {
      connected: !!(baseConfig?.keyJson || baseConfig?.keyFilePath),
      bucketName: baseConfig?.bucketName || null
    },
    apple: {
      connected: !!(baseConfig?.keyFilePath_apple && baseConfig?.appleIssuerId && baseConfig?.appleKeyId),
      issuerId: baseConfig?.appleIssuerId || null,
      keyId: baseConfig?.appleKeyId || null
    }
  });
});

// Endpoint to read config (sanitized - strips private keys from response)
app.get("/api/config", authenticate, (req, res) => {
  const activePath = getActualConfigPath();
  if (!fs.existsSync(activePath)) {
    return res.status(404).json({ error: "Config file not found" });
  }
  try {
    const raw = fs.readFileSync(activePath, "utf8");
    const parsed = JSON.parse(raw);
    res.json({ config: parsed, path: activePath });
  } catch (err) {
    res.status(500).json({ error: "Failed to read config", details: err.message });
  }
});

// Endpoint to write config
app.put("/api/config", authenticate, (req, res) => {
  const activePath = getActualConfigPath();
  const { config } = req.body;
  if (!config) {
    return res.status(400).json({ error: "config body is required" });
  }
  try {
    // Validate it's valid JSON structure (array or object)
    const serialized = JSON.stringify(config, null, 2);
    // Safety: backup existing
    if (fs.existsSync(activePath)) {
      fs.writeFileSync(activePath + ".bak", fs.readFileSync(activePath));
    }
    fs.writeFileSync(activePath, serialized, "utf8");
    res.json({ success: true, path: activePath });
  } catch (err) {
    res.status(500).json({ error: "Failed to write config", details: err.message });
  }
});

// Test Apple App Store Connect connection
app.post("/api/test/apple", authenticate, async (req, res) => {
  const baseConfig = getBaseConfig();
  if (!baseConfig) {
    return res.status(400).json({ success: false, error: "No config found" });
  }
  try {
    const appleKeyPath = resolveKeyFilePath(baseConfig.keyFilePath_apple);
    if (!appleKeyPath || !fs.existsSync(appleKeyPath)) {
      return res.json({ success: false, error: "Apple private key file not found" });
    }
    const privateKey = fs.readFileSync(appleKeyPath, "utf8");
    const appleStatsViewer = new AppleAppStoreStatsViewer({
      issuerId: baseConfig.appleIssuerId,
      keyId: baseConfig.appleKeyId,
      vendorId: baseConfig.appleVendorId,
      privateKey,
      dataDir: DATA_DIR
    });
    const apps = await appleStatsViewer.listPackages();
    res.json({ success: true, appCount: apps.length, apps: apps.slice(0, 5).map(a => ({ name: a.name, bundleId: a.bundleId || a.packageName })) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Test Google Play Console connection
app.post("/api/test/google", authenticate, async (req, res) => {
  const baseConfig = getBaseConfig();
  if (!baseConfig) {
    return res.status(400).json({ success: false, error: "No config found" });
  }
  try {
    const googleStatsViewer = new GooglePlayStoreStatsViewer({
      keyFilePath: resolveKeyFilePath(baseConfig.keyFilePath),
      keyJson: baseConfig.keyJson,
      projectID: baseConfig.projectID,
      bucketName: baseConfig.bucketName,
      packageName: "dummy",
      dataDir: DATA_DIR
    });
    let packages = await googleStatsViewer.listPackages();
    const ignored = baseConfig.ignoredPackages || [];
    packages = packages.filter(p => !ignored.includes(p.packageName));
    res.json({ success: true, appCount: packages.length, apps: packages.slice(0, 5).map(p => ({ name: p.name, packageName: p.packageName })) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Endpoint to fetch saved projects (dynamically discovered from bucket)
app.get("/api/projects", authenticate, async (req, res) => {
  const baseConfig = getBaseConfig();
  if (!baseConfig) {
    return res.json([]);
  }

  const projects = [];

  // Google Play Projects
  try {
    const googleStatsViewer = new GooglePlayStoreStatsViewer({
      keyFilePath: resolveKeyFilePath(baseConfig.keyFilePath),
      keyJson: baseConfig.keyJson,
      projectID: baseConfig.projectID,
      bucketName: baseConfig.bucketName,
      packageName: "dummy",
      dataDir: DATA_DIR
    });

    let packages = await googleStatsViewer.listPackages();
    const ignored = baseConfig.ignoredPackages || [];
    packages = packages.filter(p => !ignored.includes(p.packageName));

    for (let idx = 0; idx < packages.length; idx++) {
      const p = packages[idx];
      const metadata = baseConfig.appMetadata?.[p.packageName] || {};
      let cachedScraped = await getScrapedPlayStoreData(p.packageName);

      const storeUrl = metadata.storeUrl || cachedScraped?.url || `https://play.google.com/store/apps/details?id=${p.packageName}`;
      
      // Console URL Construction using PlaystoreConsoleUrl or developerConsoleId or per-app metadata
      const consoleBase = baseConfig.PlaystoreConsoleUrl
        ? baseConfig.PlaystoreConsoleUrl.replace(/\/+$/, '')
        : `https://play.google.com/console/u/0/developers/${metadata.developerConsoleId || baseConfig.developerConsoleId || '7018441398256771959'}`;

      const appId = metadata.consoleAppId || (p.packageName === 'io.github.zmsp.addaboard' ? '4976209752217554327' : null);

      const consoleUrl = metadata.consoleUrl || (appId ? `${consoleBase}/app/${appId}/app-dashboard` : consoleBase);
      const iconUrl = metadata.iconUrl || cachedScraped?.iconUrl || `https://s2.googleusercontent.com/s2/favicons?domain=play.google.com&sz=128`;
      const name = metadata.displayName || cachedScraped?.title || p.name;

      projects.push({
        index: `g-${idx}`,
        name,
        platform: "google",
        packageName: p.packageName,
        storeUrl,
        consoleUrl,
        iconUrl,
        hasKey: !!(baseConfig.keyJson || baseConfig.keyFilePath)
      });
    }
  } catch (error) {
    console.error("Error discovering Google projects:", error);
  }

  // Apple App Store Projects
  if (baseConfig.keyFilePath_apple) {
    try {
      const appleKeyPath = resolveKeyFilePath(baseConfig.keyFilePath_apple);
      if (appleKeyPath && fs.existsSync(appleKeyPath)) {
        const privateKey = fs.readFileSync(appleKeyPath, "utf8");
        console.log(`Successfully read Apple private key from ${appleKeyPath} (length: ${privateKey.length})`);

        const appleStatsViewer = new AppleAppStoreStatsViewer({
          issuerId: baseConfig.appleIssuerId,
          keyId: baseConfig.appleKeyId,
          vendorId: baseConfig.appleVendorId,
          privateKey: privateKey,
          dataDir: DATA_DIR
        });

        const apps = await appleStatsViewer.listPackages();
        for (let idx = 0; idx < apps.length; idx++) {
          const app = apps[idx];
          const metadata = baseConfig.appMetadata?.[app.packageName || app.bundleId] || {};
          const appleStoreData = await getScrapedAppleStoreData(app.bundleId || app.appId || app.packageName);

          const storeUrl = metadata.storeUrl || appleStoreData?.url || (app.adamId ? `https://apps.apple.com/app/id${app.adamId}` : null);
          const consoleUrl = metadata.consoleUrl || `https://appstoreconnect.apple.com/apps`;
          const iconUrl = metadata.iconUrl || appleStoreData?.iconUrl || `https://s2.googleusercontent.com/s2/favicons?domain=apps.apple.com&sz=128`;
          const name = metadata.displayName || appleStoreData?.title || `${app.name} (App Store)`;

          projects.push({
            index: `a-${idx}`,
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
      console.error("Error discovering Apple projects:", error.message);
    }
  }

  res.json(projects);
});

// Endpoint to fetch basic overview app stats and daily trends
app.post("/api/stats", authenticate, async (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log("POST /api/stats - Request Body:", JSON.stringify(req.body, null, 2));
  }
  const baseConfig = getBaseConfig();
  const platform = req.body.platform || "google";

  if (req.body.projectIndex === "all") {
    try {
      let packages = [];
      let applePrivateKey = null;

      // Helper function to fetch Apple packages
      const fetchApplePackages = async () => {
        try {
          const appleKeyPath = resolveKeyFilePath(baseConfig.keyFilePath_apple);
          if (!appleKeyPath) return [];
          applePrivateKey = fs.readFileSync(appleKeyPath, "utf8");
          const statsViewer = new AppleAppStoreStatsViewer({
            issuerId: baseConfig.appleIssuerId,
            keyId: baseConfig.appleKeyId,
            vendorId: baseConfig.appleVendorId,
            privateKey: applePrivateKey,
            dataDir: DATA_DIR
          });
          const pkgs = await statsViewer.listPackages();
          return pkgs.map(p => ({ ...p, platform: "apple" }));
        } catch (e) {
          console.error("Error fetching Apple packages:", e.message);
          return [];
        }
      };

      // Helper function to fetch Google packages
      const fetchGooglePackages = async () => {
        try {
          const statsViewer = new GooglePlayStoreStatsViewer({
            keyFilePath: resolveKeyFilePath(baseConfig.keyFilePath),
            keyJson: baseConfig.keyJson,
            projectID: baseConfig.projectID,
            bucketName: baseConfig.bucketName,
            packageName: "dummy",
            dataDir: DATA_DIR
          });
          let pkgs = await statsViewer.listPackages();
          const ignored = baseConfig.ignoredPackages || [];
          pkgs = pkgs.filter(p => !ignored.includes(p.packageName));
          return pkgs.map(p => ({ ...p, platform: "google" }));
        } catch (e) {
          console.error("Error fetching Google packages:", e.message);
          return [];
        }
      };

      if (platform === "apple") {
        packages = await fetchApplePackages();
      } else if (platform === "google") {
        packages = await fetchGooglePackages();
      } else if (platform === "all") {
        const [applePkgs, googlePkgs] = await Promise.all([
          fetchApplePackages(),
          fetchGooglePackages()
        ]);
        packages = [...applePkgs, ...googlePkgs];
      }

      const results = await Promise.all(packages.map(async (pkg) => {
        try {
          if (pkg.platform === "apple") {
            const v = new AppleAppStoreStatsViewer({
              issuerId: baseConfig.appleIssuerId,
              keyId: baseConfig.appleKeyId,
              vendorId: baseConfig.appleVendorId,
              privateKey: applePrivateKey,
              appId: pkg.packageName,
              dataDir: DATA_DIR
            });
            return await v.getAppStats(req.body.startDate, req.body.endDate);
          } else {
            const v = new GooglePlayStoreStatsViewer({
              keyFilePath: resolveKeyFilePath(baseConfig.keyFilePath),
              keyJson: baseConfig.keyJson,
              projectID: baseConfig.projectID,
              bucketName: baseConfig.bucketName,
              packageName: pkg.packageName,
              dataDir: DATA_DIR
            });
            return await v.getAppStats(req.body.startDate, req.body.endDate);
          }
        } catch (e) {
          console.error(`Failed to fetch stats for ${pkg.packageName}:`, e.message);
          return null;
        }
      }));

      results.forEach((res, i) => {
        if (res) {
          res.packageName = packages[i].name || packages[i].packageName;
        }
      });

      const validResults = results.filter(r => r !== null);
      if (validResults.length === 0) throw new Error("No data found for any package");

      const aggregated = aggregateOverviews(validResults);

      return res.json(aggregated);
    } catch (error) {
      console.error(`Error in /api/stats (all):`, error);
      return res.status(500).json({
        error: "Failed to aggregate stats",
        details: process.env.NODE_ENV === "production" ? "Internal Server Error" : (error.message || error)
      });
    }
  }

  try {
    let stats;
    if (platform === "apple") {
      const appleKeyPath = resolveKeyFilePath(baseConfig.keyFilePath_apple);
      if (!appleKeyPath) {
        console.error("Apple key path could not be resolved for single app stats:", baseConfig.keyFilePath_apple);
        throw new Error("Apple key file not found or access denied.");
      }
      const privateKey = fs.readFileSync(appleKeyPath, "utf8");
      console.log(`Read Apple private key for single app (length: ${privateKey.length})`);

      const statsViewer = new AppleAppStoreStatsViewer({
        issuerId: baseConfig.appleIssuerId,
        keyId: baseConfig.appleKeyId,
        vendorId: baseConfig.appleVendorId,
        privateKey: privateKey,
        appId: req.body.packageName,
        dataDir: DATA_DIR
      });
      stats = await statsViewer.getAppStats(req.body.startDate, req.body.endDate);
    } else {
      const config = getProjectConfig(req.body);
      const statsViewer = new GooglePlayStoreStatsViewer({
        keyFilePath: config.keyFilePath,
        keyJson: config.keyJson,
        packageName: config.packageName,
        projectID: config.projectID,
        bucketName: config.bucketName,
        dataDir: DATA_DIR
      });
      stats = await statsViewer.getAppStats(req.body.startDate, req.body.endDate);
    }

    console.log(`Stats fetched for ${req.body.packageName} on ${platform}. Trends count: ${stats.dailyTrends?.length || 0}`);
    res.json(stats);
  } catch (error) {
    console.error(`Error in /api/stats (${platform}):`, error);
    res.status(500).json({
      error: "Failed to fetch stats",
      details: process.env.NODE_ENV === "production" ? "Internal Server Error" : (error.message || error)
    });
  }
});

// Endpoint to fetch dimension-specific stats
app.post("/api/dimension", authenticate, async (req, res) => {
  const { dimension } = req.body;
  const baseConfig = getBaseConfig();
  const platform = req.body.platform || "google";

  if (req.body.projectIndex === "all" || platform === "all") {
    try {
      let packages = [];
      let applePrivateKey = null;

      const fetchApplePackages = async () => {
        try {
          const appleKeyPath = resolveKeyFilePath(baseConfig.keyFilePath_apple);
          if (!appleKeyPath) return [];
          applePrivateKey = fs.readFileSync(appleKeyPath, "utf8");
          const statsViewer = new AppleAppStoreStatsViewer({
            issuerId: baseConfig.appleIssuerId,
            keyId: baseConfig.appleKeyId,
            vendorId: baseConfig.appleVendorId,
            privateKey: applePrivateKey,
            dataDir: DATA_DIR
          });
          const pkgs = await statsViewer.listPackages();
          return pkgs.map(p => ({ ...p, platform: "apple" }));
        } catch (e) {
          console.error("Error fetching Apple packages for dimension:", e.message);
          return [];
        }
      };

      const fetchGooglePackages = async () => {
        try {
          const statsViewer = new GooglePlayStoreStatsViewer({
            keyFilePath: resolveKeyFilePath(baseConfig.keyFilePath),
            keyJson: baseConfig.keyJson,
            projectID: baseConfig.projectID,
            bucketName: baseConfig.bucketName,
            packageName: "dummy",
            dataDir: DATA_DIR
          });
          let pkgs = await statsViewer.listPackages();
          const ignored = baseConfig.ignoredPackages || [];
          pkgs = pkgs.filter(p => !ignored.includes(p.packageName));
          return pkgs.map(p => ({ ...p, platform: "google" }));
        } catch (e) {
          console.error("Error fetching Google packages for dimension:", e.message);
          return [];
        }
      };

      if (platform === "apple") {
        packages = await fetchApplePackages();
      } else if (platform === "google") {
        packages = await fetchGooglePackages();
      } else {
        const [applePkgs, googlePkgs] = await Promise.all([
          fetchApplePackages(),
          fetchGooglePackages()
        ]);
        packages = [...applePkgs, ...googlePkgs];
      }

      const results = await Promise.all(packages.map(async (pkg) => {
        try {
          if (pkg.platform === "apple") {
            const v = new AppleAppStoreStatsViewer({
              issuerId: baseConfig.appleIssuerId,
              keyId: baseConfig.appleKeyId,
              vendorId: baseConfig.appleVendorId,
              privateKey: applePrivateKey,
              appId: pkg.packageName,
              dataDir: DATA_DIR
            });
            return await v.getDimensionStats(dimension, req.body.startDate, req.body.endDate);
          } else {
            const v = new GooglePlayStoreStatsViewer({
              keyFilePath: resolveKeyFilePath(baseConfig.keyFilePath),
              keyJson: baseConfig.keyJson,
              projectID: baseConfig.projectID,
              bucketName: baseConfig.bucketName,
              packageName: pkg.packageName,
              dataDir: DATA_DIR
            });
            return await v.getDimensionStats(dimension, req.body.startDate, req.body.endDate);
          }
        } catch (e) {
          console.error(`Failed dimension stats for ${pkg.packageName}:`, e.message);
          return null;
        }
      }));

      const mergedMap = new Map();
      results.filter(Boolean).forEach(list => {
        if (!Array.isArray(list)) return;
        list.forEach(item => {
          const label = item.label || item.key || 'Unknown';
          if (!mergedMap.has(label)) {
            mergedMap.set(label, {
              label,
              key: label,
              totalInstalls: 0,
              activeDevices: 0,
              dailyUserInstalls: 0,
              dailyUserUninstalls: 0,
              installs: 0
            });
          }
          const curr = mergedMap.get(label);
          curr.totalInstalls += (item.totalInstalls || item.installs || 0);
          curr.installs += (item.totalInstalls || item.installs || 0);
          curr.activeDevices += (item.activeDevices || 0);
          curr.dailyUserInstalls += (item.dailyUserInstalls || 0);
          curr.dailyUserUninstalls += (item.dailyUserUninstalls || 0);
        });
      });

      const aggregatedDimensions = Array.from(mergedMap.values());
      const grandTotal = aggregatedDimensions.reduce((sum, d) => sum + d.totalInstalls, 0);
      aggregatedDimensions.forEach(d => {
        d.percentage = grandTotal > 0 ? ((d.totalInstalls / grandTotal) * 100).toFixed(1) : '0';
      });
      aggregatedDimensions.sort((a, b) => b.totalInstalls - a.totalInstalls);

      return res.json(aggregatedDimensions);
    } catch (error) {
      console.error(`Error in /api/dimension (all):`, error);
      return res.status(500).json({ error: "Failed to aggregate dimension stats" });
    }
  }

  try {
    let dimensionStats;
    if (platform === "apple") {
      const appleKeyPath = resolveKeyFilePath(baseConfig.keyFilePath_apple);
      if (!appleKeyPath) {
        console.error("Apple key path could not be resolved for single app stats:", baseConfig.keyFilePath_apple);
        throw new Error("Apple key file not found or access denied.");
      }
      const privateKey = fs.readFileSync(appleKeyPath, "utf8");
      console.log(`Read Apple private key for single app (length: ${privateKey.length})`);

      const statsViewer = new AppleAppStoreStatsViewer({
        issuerId: baseConfig.appleIssuerId,
        keyId: baseConfig.appleKeyId,
        vendorId: baseConfig.appleVendorId,
        privateKey: privateKey,
        appId: req.body.packageName,
        dataDir: DATA_DIR
      });
      dimensionStats = await statsViewer.getDimensionStats(dimension, req.body.startDate, req.body.endDate);
    } else {
      const config = getProjectConfig(req.body);
      const statsViewer = new GooglePlayStoreStatsViewer({
        keyFilePath: config.keyFilePath,
        keyJson: config.keyJson,
        packageName: config.packageName,
        projectID: config.projectID,
        bucketName: config.bucketName,
        dataDir: DATA_DIR
      });

      dimensionStats = await statsViewer.getDimensionStats(dimension, req.body.startDate, req.body.endDate);
    }
    res.json(dimensionStats);
  } catch (error) {
    console.error(`Error in /api/dimension for ${dimension} on ${platform}:`, error);
    res.status(500).json({
      error: `Failed to fetch dimension stats`,
      details: process.env.NODE_ENV === "production" ? "Internal Server Error" : (error.message || error)
    });
  }
});

// --- Releases Management ---

// Get releases
app.get("/api/releases", authenticate, (req, res) => {
  if (!fs.existsSync(RELEASES_FILE)) {
    return res.json([]);
  }
  try {
    const data = fs.readFileSync(RELEASES_FILE, "utf8");
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: "Failed to read releases" });
  }
});

// Add a release
app.post("/api/releases", authenticate, (req, res) => {
  const { version, platform, date, notes } = req.body;
  if (!version || !platform || !date) {
    return res.status(400).json({ error: "Missing required fields: version, platform, date" });
  }

  let releases = [];
  if (fs.existsSync(RELEASES_FILE)) {
    try {
      const content = fs.readFileSync(RELEASES_FILE, "utf8");
      if (content.trim()) {
        releases = JSON.parse(content);
      }
    } catch (e) {
      console.error("Error parsing releases file, resetting:", e);
    }
  }

  const newRelease = { version, platform, date, notes };
  releases.push(newRelease);

  // Sort by date descending
  releases.sort((a, b) => new Date(b.date) - new Date(a.date));

  fs.writeFileSync(RELEASES_FILE, JSON.stringify(releases, null, 2));
  res.json({ success: true, release: newRelease });
});

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Play Store Stats Dashboard Server running at http://localhost:${PORT}`);
});
