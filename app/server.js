const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { exec, execSync } = require("child_process");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const rateLimit = require('express-rate-limit');
const axios = require("axios");
const GooglePlayStoreStatsViewer = require("./lib/GooglePlayStoreStatsViewer");
const AppleAppStoreStatsViewer = require("./lib/AppleAppStoreStatsViewer");
const cache = require("./lib/cache");
const resolver = require("./lib/resolver");
const { aggregateOverviews, getNormalizedPairings, matchAndPairApps, correlateReleases, calculateRetentionBenchmarks, weekdayAverages, linearForecast, concentrationIndex, fillContinuousDailyTrends } = require("./lib/metrics");
const { ensureDirectoriesAndTemplates } = require("./lib/init");
const asoRouter = require("./routes/aso");
const { sendNtfyNotification, syncNtfyTopicMessages, clearNotifications, markNotificationsRead } = require("./lib/notifier");
const { checkAndNotifyStats, startPeriodicScheduler, getSchedulerStatus } = require("./lib/scheduler");
const { calculateAppHealthScore } = require("./lib/healthScore");
const { db } = require("./lib/db");


const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? path.join(__dirname, "data") : path.join(__dirname, "..", "data"));

// Ensure all data directories and template files exist on initial load
ensureDirectoriesAndTemplates(DATA_DIR);

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  const secretFile = path.join(DATA_DIR, ".jwt_secret");
  if (fs.existsSync(secretFile)) {
    try {
      JWT_SECRET = fs.readFileSync(secretFile, "utf8").trim();
    } catch (e) {
      JWT_SECRET = "dev-insecure-secret-key-fallback";
    }
  } else {
    JWT_SECRET = "dev-insecure-secret-key-" + bcrypt.genSaltSync(10);
    try {
      fs.writeFileSync(secretFile, JWT_SECRET, "utf8");
    } catch (e) {
      JWT_SECRET = "dev-insecure-secret-key-fallback";
    }
  }
}

const PASSWORD_FILE = path.join(DATA_DIR, ".admin_password");
const RELEASES_FILE = path.join(DATA_DIR, "releases.json");
const NOTES_DIR = path.join(DATA_DIR, "notes");



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
    return res.status(400).json({ error: "Password not set up yet. Please complete initial setup." });
  }

  const isValid = bcrypt.compareSync(password, storedHash);
  if (isValid) {
    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "365d" });
    res.json({ token });
  } else {
    res.status(401).json({ error: "Invalid password" });
  }
});

// Auth Middleware
const authenticate = (req, res, next) => {
  if (!isPasswordSet()) {
    return next();
  }

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

app.use('/api', authenticate, asoRouter);

// --- Protected Endpoints ---

// Helper to read and parse config.json dynamically
const configFilePath = process.env.CONFIG_PATH || path.join(DATA_DIR, "config", "config.json");

// Fallback to legacy config location if not in data dir
const getActualConfigPath = () => {
  const defaultPath = configFilePath;
  if (fs.existsSync(defaultPath)) {
    return defaultPath;
  }
  const dataConfigPath = path.join(DATA_DIR, "config", "config.json");
  if (fs.existsSync(dataConfigPath)) {
    return dataConfigPath;
  }
  const rootDataConfigPath = path.join(DATA_DIR, "config.json");
  if (fs.existsSync(rootDataConfigPath)) {
    return rootDataConfigPath;
  }
  const legacyPath = path.join(__dirname, "..", "config", "config.json");
  if (fs.existsSync(legacyPath)) {
    return legacyPath;
  }
  const appConfigPath = path.join(__dirname, "config", "config.json");
  if (fs.existsSync(appConfigPath)) {
    return appConfigPath;
  }
  console.warn(`No config file found! Tried: ${defaultPath}, ${dataConfigPath}, ${rootDataConfigPath}, ${legacyPath}, ${appConfigPath}`);
  return defaultPath;
};

let _configCache = null;
let _configCacheTime = 0;
let _configCacheMTime = 0;

const invalidateConfigCache = () => {
  _configCache = null;
  _configCacheTime = 0;
  _configCacheMTime = 0;
  resolver.clearCache('projects');
  resolver.clearCache('packages');
  resolver.clearCache('stats');
  resolver.clearCache('config');
};

const getBaseConfig = () => {
  const now = Date.now();
  const activePath = getActualConfigPath();
  if (!fs.existsSync(activePath)) {
    _configCache = null;
    _configCacheTime = now;
    _configCacheMTime = 0;
    return null;
  }
  try {
    const stat = fs.statSync(activePath);
    if (_configCache && (now - _configCacheTime < 60 * 1000) && _configCacheMTime === stat.mtimeMs) {
      return _configCache;
    }
    const rawData = fs.readFileSync(activePath, "utf8");
    const parsed = JSON.parse(rawData);
    _configCache = Array.isArray(parsed) ? parsed[0] : parsed;
    _configCacheTime = now;
    _configCacheMTime = stat.mtimeMs;
    return _configCache;
  } catch (error) {
    console.error("Critical configuration failure:", error.message);
    _configCache = null;
    _configCacheTime = now;
    _configCacheMTime = 0;
    return null;
  }
};

const getIgnoredSet = (baseConfig) => {
  const list = [...(baseConfig?.ignoredPackages || [])];
  const normalizedPairs = getNormalizedPairings(baseConfig);
  normalizedPairs.forEach(pair => {
    if (pair.ignore) {
      if (pair.googlePackageName) list.push(pair.googlePackageName);
      if (pair.appleBundleId) list.push(pair.appleBundleId);
    }
  });
  return new Set(list.map(p => String(p).trim().toLowerCase()).filter(Boolean));
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

// --- Viewer Factory Helpers ---

/**
 * Constructs an AppleAppStoreStatsViewer with credentials from config.
 * Resolves the key file and reads the private key.
 * @param {object} baseConfig
 * @param {string} [appId]
 * @returns {AppleAppStoreStatsViewer}
 */
const buildAppleViewer = (baseConfig, appId) => {
  const appleKeyPath = resolveKeyFilePath(baseConfig.keyFilePath_apple);
  if (!appleKeyPath) throw new Error('Apple key file not found or access denied.');
  const privateKey = require('fs').readFileSync(appleKeyPath, 'utf8');
  return new AppleAppStoreStatsViewer({
    issuerId: baseConfig.appleIssuerId,
    keyId: baseConfig.appleKeyId,
    vendorId: baseConfig.appleVendorId,
    privateKey,
    appId,
    dataDir: DATA_DIR
  });
};

/**
 * Constructs a GooglePlayStoreStatsViewer with credentials from config.
 * @param {object} baseConfig
 * @param {string} packageName
 * @returns {GooglePlayStoreStatsViewer}
 */
const buildGoogleViewer = (baseConfig, packageName) => {
  return new GooglePlayStoreStatsViewer({
    keyFilePath: resolveKeyFilePath(baseConfig.keyFilePath),
    keyJson: baseConfig.keyJson,
    projectID: baseConfig.projectID,
    bucketName: baseConfig.bucketName,
    packageName,
    dataDir: DATA_DIR
  });
};

/**
 * Fetches all packages for the given platform(s) from the configured stores.
 * Returns an array of package objects, each with a `.platform` property.
 * @param {'apple'|'google'|'all'} platform
 * @param {object} baseConfig
 * @returns {Promise<Array>}
 */
const fetchPackagesByPlatform = async (platform, baseConfig) => {
  return resolver.resolve('packages:all', { platform }, async () => {
    const fetchApple = async () => {
      try {
        const viewer = buildAppleViewer(baseConfig);
        const pkgs = await viewer.listPackages();
        return pkgs.map(p => ({ ...p, platform: 'apple' }));
      } catch (e) {
        console.error('Error fetching Apple packages:', e.message);
        return [];
      }
    };

    const fetchGoogle = async () => {
      try {
        const viewer = buildGoogleViewer(baseConfig, 'dummy');
        let pkgs = await viewer.listPackages();
        const ignoredSet = getIgnoredSet(baseConfig);
        pkgs = pkgs.filter(p => !ignoredSet.has(String(p.packageName).trim().toLowerCase()));
        return pkgs.map(p => ({ ...p, platform: 'google' }));
      } catch (e) {
        console.error('Error fetching Google packages:', e.message);
        return [];
      }
    };

    if (platform === 'apple') return fetchApple();
    if (platform === 'google') return fetchGoogle();
    // 'all'
    const [applePkgs, googlePkgs] = await Promise.all([fetchApple(), fetchGoogle()]);
    return [...applePkgs, ...googlePkgs];
  });
};

const schedulerHelpers = {
  getBaseConfig,
  DATA_DIR,
  buildGoogleViewer,
  buildAppleViewer,
  fetchPackagesByPlatform
};

const PLAYSTORE_CACHE_FILE = path.join(DATA_DIR, "playstore_scrape_cache.json");
const APPSTORE_CACHE_FILE = path.join(DATA_DIR, "appstore_scrape_cache.json");

const getScrapedAppleStoreData = async (identifier) => {
  if (!identifier) return null;
  return resolver.resolve('scrape:apple', { identifier }, async () => {
    // Check legacy file cache on disk as fallback before calling API
    let cache = {};
    try {
      if (fs.existsSync(APPSTORE_CACHE_FILE)) {
        cache = JSON.parse(fs.readFileSync(APPSTORE_CACHE_FILE, "utf8"));
        if (cache[identifier]?.data) {
          return cache[identifier].data;
        }
      }
    } catch (e) {}

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
        try { fs.writeFileSync(APPSTORE_CACHE_FILE, JSON.stringify(cache, null, 2)); } catch {}
        return scraped;
      }
    } catch (err) {
      console.error(`Could not scrape App Store metadata for ${identifier}:`, err.message);
    }
    return null;
  });
};

const getScrapedPlayStoreData = async (appId) => {
  if (!appId) return null;
  return resolver.resolve('scrape:google', { appId }, async () => {
    // Check legacy file cache on disk as fallback before calling API
    let cache = {};
    try {
      if (fs.existsSync(PLAYSTORE_CACHE_FILE)) {
        cache = JSON.parse(fs.readFileSync(PLAYSTORE_CACHE_FILE, "utf8"));
        if (cache[appId]?.data) {
          return cache[appId].data;
        }
      }
    } catch (e) {}

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
      try { fs.writeFileSync(PLAYSTORE_CACHE_FILE, JSON.stringify(cache, null, 2)); } catch {}
      return scraped;
    } catch (err) {
      console.warn(`Could not scrape Play Store metadata for ${appId}:`, err.message);
      return null;
    }
  });
};

// Endpoint to fetch store details on-demand via scraper
app.post("/api/store-details", authenticate, async (req, res) => {
  const { packageName, platform, cacheOnly } = req.body;
  if (!packageName) {
    return res.status(400).json({ error: "packageName is required" });
  }

  const isApple = platform === "apple" || platform === "ios";

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
  if (!scraped && !platform) {
    // Fallback attempt with Apple metadata only if platform was completely unprovided
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

app.get("/healthz", (req, res) => {
  const pkg = require("./package.json");
  res.json({
    status: "ok",
    version: pkg.version || "1.0.0",
    uptime: Math.round(process.uptime()),
    dbOpen: true
  });
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
    invalidateConfigCache();
    res.json({ success: true, path: activePath });
  } catch (err) {
    res.status(500).json({ error: "Failed to write config", details: err.message });
  }
});

// Endpoint for Note AI Chat assistant
app.post("/api/notes/ai-chat", authenticate, async (req, res) => {
  const { noteTitle, noteContent, messages = [], provider, model } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Messages array is required" });
  }

  const lastUserMsg = messages[messages.length - 1]?.content || "";

  try {
    const aiModule = require("./lib/ai");
    const aiResponse = await aiModule.generateJSON({
      provider: provider || undefined,
      customModel: model || undefined,
      system: "You are a helpful, concise AI writing and brainstorming assistant for App Store stats and note management. Help the user edit, summarize, extract tasks, or brainstorm ideas based on their current note. Keep your response brief, clear, and direct.",
      prompt: `Current Note Title: "${noteTitle || 'Untitled Note'}"\nCurrent Note Content:\n\`\`\`markdown\n${(noteContent || '').slice(0, 4000)}\n\`\`\`\n\nUser Question/Instruction: "${lastUserMsg}"\n\nProvide a clear, helpful response to the user's question or instruction.`,
      schema: {
        type: "object",
        properties: {
          reply: { type: "string" }
        },
        required: ["reply"]
      }
    });

    res.json({ reply: aiResponse.data?.reply || "I'm sorry, I couldn't generate a response." });
  } catch (err) {
    console.warn("[Note AI Chat] Fallback due to error:", err.message);
    res.json({
      reply: `Note Assistant: I received your request ("${lastUserMsg.slice(0, 50)}..."), but could not contact the AI service (${err.message}). Please make sure your AI Provider API key is configured.`
    });
  }
});

// Test Apple App Store Connect connection
app.post("/api/test/apple", authenticate, async (req, res) => {
  console.log(`[Test Connection] [Apple] Initiating test connection check...`);
  const baseConfig = getBaseConfig();
  if (!baseConfig) {
    console.warn(`[Test Connection] [Apple] Failed: No configuration found.`);
    return res.status(400).json({ success: false, error: "No config found" });
  }
  try {
    const appleKeyPath = resolveKeyFilePath(baseConfig.keyFilePath_apple);
    console.log(`[Test Connection] [Apple] KeyID: ${baseConfig.appleKeyId}, IssuerID: ${baseConfig.appleIssuerId}, VendorID: ${baseConfig.appleVendorId}, KeyPath: ${appleKeyPath}`);
    if (!appleKeyPath || !fs.existsSync(appleKeyPath)) {
      console.warn(`[Test Connection] [Apple] Key file not found at: ${appleKeyPath}`);
      return res.json({ success: false, error: "Apple private key file not found" });
    }
    const appleStatsViewer = buildAppleViewer(baseConfig);
    const apps = await appleStatsViewer.listPackages();
    console.log(`[Test Connection] [Apple] SUCCESS — Found ${apps.length} apps.`);
    res.json({ success: true, appCount: apps.length, apps: apps.slice(0, 5).map(a => ({ name: a.name, bundleId: a.bundleId || a.packageName })) });
  } catch (err) {
    console.error(`[Test Connection] [Apple] ERROR:`, err.message);
    res.json({ success: false, error: err.message });
  }
});

// Test Google Play Console connection
app.post("/api/test/google", authenticate, async (req, res) => {
  console.log(`[Test Connection] [Google] Initiating test connection check...`);
  const baseConfig = getBaseConfig();
  if (!baseConfig) {
    console.warn(`[Test Connection] [Google] Failed: No configuration found.`);
    return res.status(400).json({ success: false, error: "No config found" });
  }
  try {
    const keyPath = resolveKeyFilePath(baseConfig.keyFilePath);
    console.log(`[Test Connection] [Google] ProjectID: ${baseConfig.projectID}, Bucket: ${baseConfig.bucketName}, KeyPath: ${keyPath}`);
    const googleStatsViewer = buildGoogleViewer(baseConfig, 'dummy');
    let packages = await googleStatsViewer.listPackages();
    const ignoredSet = getIgnoredSet(baseConfig);
    packages = packages.filter(p => !ignoredSet.has(String(p.packageName).trim().toLowerCase()));
    console.log(`[Test Connection] [Google] SUCCESS — Found ${packages.length} apps.`);
    res.json({ success: true, appCount: packages.length, apps: packages.slice(0, 5).map(p => ({ name: p.name, packageName: p.packageName })) });
  } catch (err) {
    console.error(`[Test Connection] [Google] ERROR:`, err.message);
    res.json({ success: false, error: err.message });
  }
});

// Test AI Provider connection (1 token request)
app.post("/api/test/ai", authenticate, async (req, res) => {
  const { provider, model, apiKey } = req.body || {};
  console.log(`[Test Connection] [AI] Initiating test request for provider "${provider || 'default'}" (model: ${model || 'default'})...`);
  try {
    const aiModule = require("./lib/ai");
    const response = await aiModule.generateJSON({
      system: "Reply with status ok.",
      prompt: "Ping",
      schema: {
        type: "object",
        properties: {
          status: { type: "string" }
        },
        required: ["status"]
      },
      provider,
      customModel: model,
      customApiKey: apiKey,
      maxTokens: 10
    });
    console.log(`[Test Connection] [AI] SUCCESS — Provider: ${response.provider}, Model: ${response.model}, Usage:`, response.usage);
    res.json({
      success: true,
      provider: response.provider,
      model: response.model,
      usage: response.usage
    });
  } catch (err) {
    console.error(`[Test Connection] [AI] ERROR (${provider}/${model}):`, err.message);
    res.json({ success: false, error: err.message });
  }
});

// Test Git Remote Repository Connection (git ls-remote / fetch)
app.post("/api/test/git", authenticate, async (req, res) => {
  const { remoteUrl, branch, username, password } = req.body || {};

  const baseConfig = getBaseConfig() || {};
  const gitConfig = baseConfig.gitNotes || baseConfig.git || {};

  const targetUrl = remoteUrl || gitConfig.remoteUrl || process.env.GIT_REMOTE_URL || '';
  const targetBranch = branch || gitConfig.branch || process.env.GIT_NOTES_BRANCH || 'main';
  const targetUser = username || gitConfig.username || process.env.GIT_USERNAME || '';
  const targetPass = password || gitConfig.password || process.env.GIT_PASSWORD || process.env.GIT_TOKEN || '';

  if (!targetUrl) {
    return res.json({
      success: false,
      error: "Git Remote URL is empty. Please specify a remote repository URL (e.g. https://github.com/username/repo.git)."
    });
  }

  ensureGitNotesRepo();

  let authRemote = targetUrl;
  if (targetUser && targetPass && authRemote.startsWith('https://')) {
    const cleanUrl = authRemote.replace(/^https:\/\//, '');
    authRemote = `https://${encodeURIComponent(targetUser)}:${encodeURIComponent(targetPass)}@${cleanUrl}`;
  }

  console.log(`[Test Connection] [Git] Testing remote URL "${targetUrl}" (branch: ${targetBranch})...`);

  try {
    const output = execSync(`git ls-remote "${authRemote}" ${targetBranch}`, {
      cwd: NOTES_DIR,
      encoding: 'utf8',
      timeout: 15000
    });

    console.log(`[Test Connection] [Git] SUCCESS — Fetched remote refs:`, output.trim().split('\n')[0]);
    res.json({
      success: true,
      message: `Successfully connected to Git remote repository and verified branch "${targetBranch}".`,
      output: output.trim().split('\n')[0] || 'Remote head verified'
    });
  } catch (err) {
    console.error(`[Test Connection] [Git] ERROR:`, err.message);
    res.json({
      success: false,
      error: `Failed to connect to Git remote: ${err.stderr || err.message}`
    });
  }
});

// Admin endpoint to monitor cache metrics and tier hits

app.get("/api/cache-stats", authenticate, (req, res) => {
  res.json(resolver.getMetrics());
});

// Endpoint to fetch saved projects (dynamically discovered from bucket)
app.get("/api/projects", authenticate, async (req, res) => {
  const baseConfig = getBaseConfig();
  if (!baseConfig) {
    return res.json([]);
  }

  const projects = await resolver.resolve('projects', {}, async () => {
    const list = [];

    // Google Play Projects
    try {
      const googleStatsViewer = buildGoogleViewer(baseConfig, 'dummy');
      let packages = await googleStatsViewer.listPackages();
      const ignoredSet = getIgnoredSet(baseConfig);
      packages = packages.filter(p => !ignoredSet.has(String(p.packageName).trim().toLowerCase()));

      for (let idx = 0; idx < packages.length; idx++) {
        const p = packages[idx];
        const metadata = baseConfig.appMetadata?.[p.packageName] || {};
        const cachedScraped = await getScrapedPlayStoreData(p.packageName);

        const storeUrl = metadata.storeUrl || cachedScraped?.url || `https://play.google.com/store/apps/details?id=${p.packageName}`;
        const consoleBase = baseConfig.PlaystoreConsoleUrl
          ? baseConfig.PlaystoreConsoleUrl.replace(/\/+$/, '')
          : `https://play.google.com/console/u/0/developers/${metadata.developerConsoleId || baseConfig.developerConsoleId || '7018441398256771959'}`;
        const appId = metadata.consoleAppId || (p.packageName === 'io.github.zmsp.addaboard' ? '4976209752217554327' : null);
        const consoleUrl = metadata.consoleUrl || (appId ? `${consoleBase}/app/${appId}/app-dashboard` : consoleBase);
        const iconUrl = metadata.iconUrl || cachedScraped?.iconUrl || `https://s2.googleusercontent.com/s2/favicons?domain=play.google.com&sz=128`;
        const name = metadata.displayName || cachedScraped?.title || p.name;

        list.push({
          index: `g-${idx}`,
          name,
          platform: 'google',
          packageName: p.packageName,
          storeUrl,
          consoleUrl,
          iconUrl,
          hasKey: !!(baseConfig.keyJson || baseConfig.keyFilePath)
        });
      }
    } catch (error) {
      console.error('Error discovering Google projects:', error);
    }

    // Apple App Store Projects
    if (baseConfig.keyFilePath_apple) {
      try {
        const appleStatsViewer = buildAppleViewer(baseConfig);
        const apps = await appleStatsViewer.listPackages();
        for (let idx = 0; idx < apps.length; idx++) {
          const app = apps[idx];
          const metadata = baseConfig.appMetadata?.[app.packageName || app.bundleId] || {};
          const appleStoreData = await getScrapedAppleStoreData(app.bundleId || app.appId || app.packageName);

          const storeUrl = metadata.storeUrl || appleStoreData?.url || (app.adamId ? `https://apps.apple.com/app/id${app.adamId}` : null);
          const consoleUrl = metadata.consoleUrl || 'https://appstoreconnect.apple.com/apps';
          const iconUrl = metadata.iconUrl || appleStoreData?.iconUrl || `https://s2.googleusercontent.com/s2/favicons?domain=apps.apple.com&sz=128`;
          const name = metadata.displayName || appleStoreData?.title || `${app.name} (App Store)`;

          list.push({
            index: `a-${idx}`,
            name,
            platform: 'apple',
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
      } catch (error) {
        console.error('Error discovering Apple projects:', error.message);
      }
    }

    return list;
  });

  if (req.query.format === 'object') {
    const googleList = (projects || []).filter(p => p.platform === 'google');
    const appleList = (projects || []).filter(p => p.platform === 'apple');
    const pairings = matchAndPairApps(googleList, appleList, baseConfig);
    return res.json({ projects: projects || [], pairings });
  }

  res.json(projects || []);
});

// Endpoint to fetch auto-paired & configured app pairings
app.get("/api/pairings", authenticate, async (req, res) => {
  const baseConfig = getBaseConfig();
  if (!baseConfig) return res.json({ paired: [], unpairedGoogle: [], unpairedApple: [] });

  const rawProjects = await fetchPackagesByPlatform('all', baseConfig);
  const googleList = rawProjects.filter(p => p.platform === 'google');
  const appleList = rawProjects.filter(p => p.platform === 'apple');
  const pairings = matchAndPairApps(googleList, appleList, baseConfig);

  res.json(pairings);
});

function getReleasesFromFile() {
  if (fs.existsSync(RELEASES_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(RELEASES_FILE, 'utf8'));
    } catch (e) {
      console.error("Error reading releases file:", e);
    }
  }
  return [];
}

// Endpoint to fetch basic overview app stats and daily trends
app.post("/api/stats", authenticate, async (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log("POST /api/stats - Request Body:", JSON.stringify(req.body, null, 2));
  }
  const baseConfig = getBaseConfig();
  const platform = req.body.platform || "google";
  const projectIndex = req.body.projectIndex || "all";
  const packageName = req.body.packageName || "";
  const startDate = req.body.startDate || "";
  const endDate = req.body.endDate || "";
  const releases = getReleasesFromFile();
  const relHash = `${releases.length}_${releases[0]?.id || ''}_${releases[releases.length - 1]?.id || ''}`;

  const cacheParams = {
    platform,
    projectIndex,
    packageName,
    startDate,
    endDate,
    rel: relHash
  };

  try {
    const statsData = await resolver.resolve('stats', cacheParams, async () => {
      if (projectIndex === "all") {
        const packages = await fetchPackagesByPlatform(platform === 'all' ? 'all' : platform, baseConfig);

        const results = await Promise.all(packages.map(async (pkg) => {
          try {
            const viewer = pkg.platform === 'apple'
              ? buildAppleViewer(baseConfig, pkg.packageName)
              : buildGoogleViewer(baseConfig, pkg.packageName);
            return await viewer.getAppStats(startDate, endDate);
          } catch (e) {
            console.error(`Failed to fetch stats for ${pkg.packageName}:`, e.message);
            return null;
          }
        }));

        results.forEach((result, i) => {
          if (result) {
            result.packageName = packages[i].packageName;
            result.displayName = packages[i].name || packages[i].packageName;
          }
        });

        const validResults = results.filter(Boolean);
        if (validResults.length === 0) {
          return {
            dailyTrends: [],
            appTrends: {},
            currentlyActiveDevices: 0,
            totalInstallCountByUser: 0,
            totalDailyUserInstalls: 0,
            totalDailyUserUninstalls: 0,
            platformTotals: {
              apple: { totalInstalls: 0, totalDailyUserInstalls: 0 },
              google: { totalInstalls: 0, totalDailyUserInstalls: 0 }
            },
            message: 'No store stats or configuration available for selected scope.'
          };
        }

        const aggregated = aggregateOverviews(validResults);
        if (aggregated) {
          aggregated.dailyTrends = fillContinuousDailyTrends(aggregated.dailyTrends || [], startDate, endDate);
          // For groups / all apps view: skip auto-calculating release correlations & benchmarks
          aggregated.retentionBenchmarks = { survivalTrend: [], churnAnomalies: [] };
          aggregated.releaseCorrelations = [];
          aggregated.weekdayAverages = weekdayAverages(aggregated.dailyTrends, 'dailyInstalls');
          aggregated.linearForecast = linearForecast(aggregated.dailyTrends.map(t => t.dailyInstalls || 0), 14);
          
          const { score, alerts, metrics } = calculateAppHealthScore(aggregated, {});
          aggregated.appHealthScore = score;
          aggregated.appHealthAlerts = alerts;
          aggregated.appHealthMetrics = metrics;
        }

        return aggregated;
      } else {
        let stats;
        try {
          if (platform === "apple") {
            const statsViewer = buildAppleViewer(baseConfig, packageName);
            stats = await statsViewer.getAppStats(startDate, endDate);
          } else {
            const statsViewer = buildGoogleViewer(baseConfig, packageName);
            stats = await statsViewer.getAppStats(startDate, endDate);
          }
        } catch (e) {
          console.warn(`Failed to fetch stats for single app ${packageName} on ${platform}:`, e.message);
          stats = {
            dailyTrends: [],
            appTrends: {},
            currentlyActiveDevices: 0,
            totalInstallCountByUser: 0,
            totalDailyUserInstalls: 0,
            totalDailyUserUninstalls: 0
          };
        }

        stats.platform = platform === "apple" ? "apple" : "google";
        stats.hasUninstallData = platform !== "apple";

        if (stats) {
          stats.dailyTrends = fillContinuousDailyTrends(stats.dailyTrends || [], startDate, endDate);
          stats.retentionBenchmarks = calculateRetentionBenchmarks(stats.dailyTrends);
          stats.releaseCorrelations = correlateReleases(stats.dailyTrends, releases, packageName, platform);
          stats.weekdayAverages = weekdayAverages(stats.dailyTrends, 'dailyInstalls');
          stats.linearForecast = linearForecast(stats.dailyTrends.map(t => t.dailyInstalls || 0), 14);

          const metadata = baseConfig.appMetadata?.[packageName] || {};
          const { score, alerts, metrics } = calculateAppHealthScore(stats, metadata);
          stats.appHealthScore = score;
          stats.appHealthAlerts = alerts;
          stats.appHealthMetrics = metrics;
        }

        console.log(`Stats fetched for ${packageName} on ${platform}. Trends count: ${stats.dailyTrends?.length || 0}`);
        return stats;
      }
    });

    res.json(statsData);
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
  const { dimension, projectIndex, packageName, startDate, endDate } = req.body;
  const baseConfig = getBaseConfig();
  const platform = req.body.platform || "google";

  const cacheParams = {
    dimension,
    platform,
    projectIndex: projectIndex || "all",
    packageName: packageName || "",
    startDate: startDate || "",
    endDate: endDate || ""
  };

  try {
    const dimensionData = await resolver.resolve('dimension', cacheParams, async () => {
      if (projectIndex === "all" || platform === "all") {
        const packages = await fetchPackagesByPlatform(platform === 'all' ? 'all' : platform, baseConfig);

        const results = await Promise.all(packages.map(async (pkg) => {
          try {
            const viewer = pkg.platform === 'apple'
              ? buildAppleViewer(baseConfig, pkg.packageName)
              : buildGoogleViewer(baseConfig, pkg.packageName);
            return await viewer.getDimensionStats(dimension, startDate, endDate);
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
              mergedMap.set(label, { label, key: label, totalInstalls: 0, activeDevices: 0, dailyUserInstalls: 0, dailyUserUninstalls: 0, installs: 0 });
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

        return aggregatedDimensions;
      } else {
        try {
          const viewer = platform === 'apple'
            ? buildAppleViewer(baseConfig, packageName)
            : buildGoogleViewer(baseConfig, packageName);
          return await viewer.getDimensionStats(dimension, startDate, endDate);
        } catch (e) {
          console.warn(`Failed dimension stats for single app ${packageName} on ${platform}:`, e.message);
          return [];
        }
      }
    });

    res.json(dimensionData);
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
  const releases = getReleasesFromFile();
  res.json(releases);
});

// Add a release
app.post("/api/releases", authenticate, (req, res) => {
  const { version, platform, packageName, date, notes, releaseDate, source } = req.body;
  const targetDate = date || releaseDate;
  if (!version || !platform || !targetDate) {
    return res.status(400).json({ error: "Missing required fields: version, platform, date" });
  }

  let releases = getReleasesFromFile();

  const newRelease = {
    id: req.body.id || `rel_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    version,
    platform,
    packageName: packageName || 'all',
    date: targetDate,
    releaseDate: targetDate,
    notes: notes || '',
    source: source || 'manual'
  };

  releases.push(newRelease);

  // Sort by date descending
  releases.sort((a, b) => new Date(b.date || b.releaseDate) - new Date(a.date || a.releaseDate));

  fs.writeFileSync(RELEASES_FILE, JSON.stringify(releases, null, 2));
  resolver.clearCache('stats');
  res.json({ success: true, release: newRelease });
});

// Update a release
app.put("/api/releases/:id", authenticate, (req, res) => {
  const { id } = req.params;
  const { version, platform, packageName, date, notes, releaseDate } = req.body;

  let releases = getReleasesFromFile();
  const index = releases.findIndex(r => String(r.id) === String(id) || String(r.id) === String(req.body.id));

  if (index === -1) {
    return res.status(404).json({ error: "Release not found" });
  }

  const targetDate = date || releaseDate || releases[index].date;

  releases[index] = {
    ...releases[index],
    version: version || releases[index].version,
    platform: platform || releases[index].platform,
    packageName: packageName !== undefined ? packageName : releases[index].packageName,
    date: targetDate,
    releaseDate: targetDate,
    notes: notes !== undefined ? notes : releases[index].notes
  };

  releases.sort((a, b) => new Date(b.date || b.releaseDate) - new Date(a.date || a.releaseDate));
  fs.writeFileSync(RELEASES_FILE, JSON.stringify(releases, null, 2));
  resolver.clearCache('stats');

  res.json({ success: true, release: releases[index] });
});

// Delete a release
app.delete("/api/releases/:id", authenticate, (req, res) => {
  const { id } = req.params;
  let releases = getReleasesFromFile();

  const initialLen = releases.length;
  releases = releases.filter(r => String(r.id) !== String(id));

  if (releases.length === initialLen) {
    return res.status(404).json({ error: "Release not found" });
  }

  fs.writeFileSync(RELEASES_FILE, JSON.stringify(releases, null, 2));
  resolver.clearCache('stats');
  res.json({ success: true, deletedId: id });
});

// --- Notes & Brainstorming Management ---

// --- Notes & Brainstorming Management (Git Markdown Directory & SQLite Sync) ---

function parseNoteMarkdown(rawText) {
  if (!rawText) return { metadata: {}, content: '' };
  
  const frontmatterMatch = rawText.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    return { metadata: {}, content: rawText };
  }

  const rawHeader = frontmatterMatch[1];
  const content = frontmatterMatch[2];
  const metadata = {};

  rawHeader.split(/\r?\n/).forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();

      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (val.startsWith('[') && val.endsWith(']')) {
        try { val = JSON.parse(val); } catch (e) { val = []; }
      } else if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      metadata[key] = val;
    }
  });

  return { metadata, content };
}

function stringifyNoteMarkdown(note) {
  const metaLines = [
    '---',
    `id: "${note.id}"`,
    `title: "${(note.title || '').replace(/"/g, '\\"')}"`,
    `packageName: "${note.packageName || 'all'}"`,
    `platform: "${note.platform || 'all'}"`,
    `tags: ${JSON.stringify(note.tags || [])}`,
    `pinned: ${Boolean(note.pinned)}`,
    `createdAt: "${note.createdAt || new Date().toISOString()}"`,
    `updatedAt: "${note.updatedAt || new Date().toISOString()}"`,
    '---',
    '',
    note.content || ''
  ];
  return metaLines.join('\n');
}

function getNotesFromStorage() {
  if (!fs.existsSync(NOTES_DIR)) {
    try { fs.mkdirSync(NOTES_DIR, { recursive: true }); } catch (e) {}
  }

  const fileNotes = [];
  try {
    if (fs.existsSync(NOTES_DIR)) {
      const subdirs = fs.readdirSync(NOTES_DIR, { withFileTypes: true });
      for (const dirent of subdirs) {
        if (dirent.isDirectory()) {
          const pkgDir = path.join(NOTES_DIR, dirent.name);
          const files = fs.readdirSync(pkgDir);
          for (const file of files) {
            if (file.endsWith('.md')) {
              try {
                const fullPath = path.join(pkgDir, file);
                const raw = fs.readFileSync(fullPath, 'utf8');
                const { metadata, content } = parseNoteMarkdown(raw);
                fileNotes.push({
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
              } catch (e) {
                console.error(`Error reading note markdown file ${file}:`, e);
              }
            }
          }
        } else if (dirent.name.endsWith('.md')) {
          try {
            const fullPath = path.join(NOTES_DIR, dirent.name);
            const raw = fs.readFileSync(fullPath, 'utf8');
            const { metadata, content } = parseNoteMarkdown(raw);
            fileNotes.push({
              id: metadata.id || path.basename(dirent.name, '.md'),
              title: metadata.title || 'Untitled Note',
              packageName: metadata.packageName || 'all',
              platform: metadata.platform || 'all',
              tags: Array.isArray(metadata.tags) ? metadata.tags : [],
              pinned: Boolean(metadata.pinned),
              createdAt: metadata.createdAt || new Date().toISOString(),
              updatedAt: metadata.updatedAt || new Date().toISOString(),
              content
            });
          } catch (e) {
            console.error(`Error reading note markdown file ${dirent.name}:`, e);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error scanning NOTES_DIR:", err);
  }

  // Also sync SQLite database if available
  if (db) {
    try {
      fileNotes.forEach(note => {
        try {
          const stmt = db.prepare(`
            INSERT INTO notes (id, package_name, platform, title, content, tags_json, pinned, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              package_name = excluded.package_name,
              platform = excluded.platform,
              title = excluded.title,
              content = excluded.content,
              tags_json = excluded.tags_json,
              pinned = excluded.pinned,
              updated_at = excluded.updated_at
          `);
          stmt.run(
            note.id,
            note.packageName || 'all',
            note.platform || 'all',
            note.title || 'Untitled Note',
            note.content || '',
            JSON.stringify(note.tags || []),
            note.pinned ? 1 : 0,
            note.createdAt || new Date().toISOString(),
            note.updatedAt || new Date().toISOString()
          );
        } catch (e) {}
      });
    } catch (e) {}
  }

  fileNotes.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  return fileNotes;
}

function saveNoteToStorage(note) {
  const pkgDirName = (note.packageName && note.packageName !== 'all') ? note.packageName.replace(/[^a-zA-Z0-9._-]/g, '_') : '_global';
  const targetDir = path.join(NOTES_DIR, pkgDirName);

  if (!fs.existsSync(targetDir)) {
    try { fs.mkdirSync(targetDir, { recursive: true }); } catch (e) {}
  }

  const filename = `${note.id}.md`;
  const filePath = path.join(targetDir, filename);
  const rawMd = stringifyNoteMarkdown(note);

  try {
    fs.writeFileSync(filePath, rawMd, 'utf8');
  } catch (e) {
    console.error(`Failed to write note markdown file ${filePath}:`, e);
  }

  if (db) {
    try {
      const stmt = db.prepare(`
        INSERT INTO notes (id, package_name, platform, title, content, tags_json, pinned, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          package_name = excluded.package_name,
          platform = excluded.platform,
          title = excluded.title,
          content = excluded.content,
          tags_json = excluded.tags_json,
          pinned = excluded.pinned,
          updated_at = excluded.updated_at
      `);
      stmt.run(
        note.id,
        note.packageName || 'all',
        note.platform || 'all',
        note.title || 'Untitled Note',
        note.content || '',
        JSON.stringify(note.tags || []),
        note.pinned ? 1 : 0,
        note.createdAt || new Date().toISOString(),
        note.updatedAt || new Date().toISOString()
      );
    } catch (e) {
      console.error("Failed to save note to DB:", e);
    }
  }

  syncNotesToGit(`docs(notes): update note "${note.title || note.id}" for ${note.packageName || 'all'}`);
}

function ensureGitNotesRepo() {
  if (!fs.existsSync(NOTES_DIR)) {
    try { fs.mkdirSync(NOTES_DIR, { recursive: true }); } catch (e) {}
  }

  const gitDir = path.join(NOTES_DIR, '.git');
  if (!fs.existsSync(gitDir)) {
    try {
      console.log(`[Git Notes] Initializing git repository at ${NOTES_DIR}...`);
      execSync('git init', { cwd: NOTES_DIR });
      execSync('git config user.name "AppRankly Notes Bot"', { cwd: NOTES_DIR });
      execSync('git config user.email "bot@apprankly.local"', { cwd: NOTES_DIR });
    } catch (e) {
      console.warn(`[Git Notes] Failed to auto-initialize Git repository:`, e.message);
    }
  }
}

// Auto-initialize Git notes repo on server startup
ensureGitNotesRepo();

function getNoteGitHistory(noteId) {
  ensureGitNotesRepo();

  let relPath = null;
  if (fs.existsSync(NOTES_DIR)) {
    try {
      const subdirs = fs.readdirSync(NOTES_DIR, { withFileTypes: true });
      for (const dirent of subdirs) {
        if (dirent.isDirectory()) {
          const testPath = path.join(NOTES_DIR, dirent.name, `${noteId}.md`);
          if (fs.existsSync(testPath)) {
            relPath = `${dirent.name}/${noteId}.md`;
            break;
          }
        } else if (dirent.name === `${noteId}.md`) {
          relPath = `${noteId}.md`;
          break;
        }
      }
    } catch (e) {}
  }

  if (!relPath) return [];

  try {
    const logOutput = execSync(`git log --pretty=format:"%H|%an|%ad|%s" --date=iso -n 25 -- "${relPath}"`, { cwd: NOTES_DIR, encoding: 'utf8' });
    if (!logOutput.trim()) return [];

    const commits = logOutput.trim().split('\n').filter(Boolean).map(line => {
      const parts = line.split('|');
      const hash = parts[0] || '';
      const author = parts[1] || 'AppRankly Bot';
      const date = parts[2] || new Date().toISOString();
      const message = parts.slice(3).join('|') || 'Update note';

      let rawContent = '';
      try {
        rawContent = execSync(`git show ${hash}:"${relPath}"`, { cwd: NOTES_DIR, encoding: 'utf8' });
      } catch (e) {}

      const parsed = parseNoteMarkdown(rawContent);
      return {
        hash,
        shortHash: hash ? hash.slice(0, 7) : '',
        author,
        date,
        message,
        title: parsed.metadata?.title || 'Note Revision',
        content: parsed.content || rawContent
      };
    });

    return commits;
  } catch (e) {
    console.warn(`[Git History Warning] Failed to fetch git history for note ${noteId}:`, e.message);
    return [];
  }
}


function syncNotesToGit(commitMessage = 'docs(notes): update app notes') {
  ensureGitNotesRepo();
  const baseConfig = getBaseConfig() || {};
  const gitConfig = baseConfig.gitNotes || baseConfig.git || {};

  const branch = gitConfig.branch || process.env.GIT_NOTES_BRANCH || 'main';
  const username = gitConfig.username || process.env.GIT_USERNAME || '';
  const password = gitConfig.password || process.env.GIT_PASSWORD || process.env.GIT_TOKEN || '';
  const remoteUrl = gitConfig.remoteUrl || process.env.GIT_REMOTE_URL || gitConfig.remote || '';

  const gitCmds = [
    'git add -A .',
    `git commit -m "${commitMessage.replace(/["\\$`]/g, '\\$&')}" || true`
  ];

  // Push to remote repository if a remote URL is configured
  if (remoteUrl) {
    let authRemote = remoteUrl;
    if (username && password && authRemote.startsWith('https://')) {
      const cleanUrl = authRemote.replace(/^https:\/\//, '');
      authRemote = `https://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${cleanUrl}`;
    }
    gitCmds.push(`git push "${authRemote}" ${branch} || git push origin ${branch} || true`);
  }

  const fullCmd = gitCmds.join(' && ');
  exec(fullCmd, { cwd: NOTES_DIR }, (error, stdout, stderr) => {
    if (error) {
      console.warn('[Git Notes Sync] Output:', stderr || error.message);
    } else {
      console.log(`[Git Notes Sync] Saved local commit (${commitMessage})${remoteUrl ? ` & pushed to remote (${branch})` : ''}`);
    }
  });
}


function deleteNoteFromStorage(id) {
  if (fs.existsSync(NOTES_DIR)) {
    try {
      const subdirs = fs.readdirSync(NOTES_DIR, { withFileTypes: true });
      for (const dirent of subdirs) {
        if (dirent.isDirectory()) {
          const targetPath = path.join(NOTES_DIR, dirent.name, `${id}.md`);
          if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
          }
        } else if (dirent.name === `${id}.md`) {
          fs.unlinkSync(path.join(NOTES_DIR, dirent.name));
        }
      }
    } catch (e) {
      console.error("Failed to delete note markdown file:", e);
    }
  }

  if (db) {
    try {
      const stmt = db.prepare('DELETE FROM notes WHERE id = ?');
      stmt.run(id);
    } catch (e) {
      console.error("Failed to delete note from DB:", e);
    }
  }

  syncNotesToGit(`docs(notes): delete note ${id}`);
}


// Get notes
app.get("/api/notes", authenticate, (req, res) => {
  let notes = getNotesFromStorage();
  const { packageName, platform } = req.query;
  if (packageName && packageName !== 'all') {
    notes = notes.filter(n => n.packageName === packageName || n.packageName === 'all');
  }
  if (platform && platform !== 'all') {
    notes = notes.filter(n => n.platform === platform || n.platform === 'all');
  }
  res.json(notes);
});

// Create note
app.post("/api/notes", authenticate, (req, res) => {
  const { title, content, packageName, platform, tags, pinned } = req.body;
  const now = new Date().toISOString();
  const newNote = {
    id: req.body.id || `note_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    title: title || 'Untitled Note',
    content: content || '',
    packageName: packageName || 'all',
    platform: platform || 'all',
    tags: Array.isArray(tags) ? tags : [],
    pinned: Boolean(pinned),
    createdAt: now,
    updatedAt: now
  };

  saveNoteToStorage(newNote);
  res.json({ success: true, note: newNote });
});

// Update note
app.put("/api/notes/:id", authenticate, (req, res) => {
  const { id } = req.params;
  const { title, content, packageName, platform, tags, pinned } = req.body;

  let notes = getNotesFromStorage();
  const existing = notes.find(n => String(n.id) === String(id));
  if (!existing) {
    return res.status(404).json({ error: "Note not found" });
  }

  const updatedNote = {
    ...existing,
    title: title !== undefined ? title : existing.title,
    content: content !== undefined ? content : existing.content,
    packageName: packageName !== undefined ? packageName : existing.packageName,
    platform: platform !== undefined ? platform : existing.platform,
    tags: Array.isArray(tags) ? tags : existing.tags,
    pinned: pinned !== undefined ? Boolean(pinned) : existing.pinned,
    updatedAt: new Date().toISOString()
  };

  saveNoteToStorage(updatedNote);
  res.json({ success: true, note: updatedNote });
});

// Delete note
app.delete("/api/notes/:id", authenticate, (req, res) => {
  const { id } = req.params;
  deleteNoteFromStorage(id);
  res.json({ success: true, deletedId: id });
});

// Get Git commit version history for a note
app.get("/api/notes/:id/history", authenticate, (req, res) => {
  const { id } = req.params;
  const history = getNoteGitHistory(id);
  res.json({ success: true, history });
});

// Restore historical commit version of a note
app.post("/api/notes/:id/restore", authenticate, (req, res) => {
  const { id } = req.params;
  const { commitHash, content, title } = req.body;

  let notes = getNotesFromStorage();
  const existing = notes.find(n => String(n.id) === String(id));
  if (!existing) {
    return res.status(404).json({ error: "Note not found" });
  }

  const restoredNote = {
    ...existing,
    title: title || existing.title,
    content: content || existing.content,
    updatedAt: new Date().toISOString()
  };

  saveNoteToStorage(restoredNote);
  res.json({ success: true, note: restoredNote });
});

// Generate ASO recommendation note for an app (AI-enhanced or standard fallback with telemetry summary)
app.post("/api/notes/generate-aso", authenticate, async (req, res) => {
  const { packageName, platform, appTitle, summarizedData } = req.body;
  const targetPackage = packageName || 'all';
  const targetPlatform = platform || 'all';

  let title = `ASO Strategy & AI Recommendations: ${appTitle || targetPackage}`;
  let templateContent = '';

  let telemetrySection = '';
  if (summarizedData) {
    const inst = Number(summarizedData.installs || 0).toLocaleString();
    const uninst = Number(summarizedData.uninstalls || 0).toLocaleString();
    const net = Number(summarizedData.netGrowth || ((summarizedData.installs || 0) - (summarizedData.uninstalls || 0))).toLocaleString();
    const netFormatted = (Number(summarizedData.netGrowth || 0) >= 0 ? '+' : '') + net;
    const active = Number(summarizedData.activeDevices || 0).toLocaleString();
    const ver = summarizedData.version || 'N/A';

    telemetrySection = `## 📊 Telemetry & Performance Summary
- **Total Installs**: ${inst}
- **Total Uninstalls**: ${uninst}
- **Net Growth**: ${netFormatted}
- **Active Devices**: ${active}
- **App Version**: ${ver}

---
`;
  }

  try {
    const aiModule = require("./lib/ai");
    const telemetryContext = summarizedData ? `Current telemetry: Installs=${summarizedData.installs}, Uninstalls=${summarizedData.uninstalls}, ActiveDevices=${summarizedData.activeDevices}, Version=${summarizedData.version}` : '';
    const aiResponse = await aiModule.generateJSON({
      system: "You are an expert App Store Optimization (ASO) strategist for iOS App Store and Google Play Store.",
      prompt: `Generate an ASO audit and keyword strategy note for app "${appTitle || targetPackage}" (Package/Bundle: ${targetPackage}, Platform: ${targetPlatform}). ${telemetryContext}. Include 3 primary title keywords, 3 subtitle/short description suggestions, 3 screenshot visual hypotheses, and 5 ASO action items in Markdown format.`,
      schema: {
        type: "object",
        properties: {
          titleKeywords: { type: "array", items: { type: "string" } },
          subtitleIdeas: { type: "array", items: { type: "string" } },
          screenshotHypotheses: { type: "array", items: { type: "string" } },
          actionItems: { type: "array", items: { type: "string" } },
          summaryMarkdown: { type: "string" }
        },
        required: ["summaryMarkdown", "titleKeywords"]
      }
    });

    const aiData = aiResponse.data || {};
    templateContent = `# ASO AI Strategy: ${appTitle || targetPackage}

> Generated by AI (${aiResponse.model || 'ASO Assistant'}) on ${new Date().toLocaleDateString()}
> Package: \`${targetPackage}\` | Platform: \`${targetPlatform.toUpperCase()}\`

---

${telemetrySection}
## 🎯 1. Target Title Keywords
${(aiData.titleKeywords || []).map(k => `- **${k}**`).join('\n')}

## ✍️ 2. Subtitle & Short Description Copy Options
${(aiData.subtitleIdeas || []).map(s => `- ${s}`).join('\n')}

## 🖼️ 3. Screenshot Visual A/B Hypotheses
${(aiData.screenshotHypotheses || []).map(h => `- [ ] ${h}`).join('\n')}

## 📝 4. Action Items & Checklist
${(aiData.actionItems || []).map(a => `- [ ] ${a}`).join('\n')}

${aiData.summaryMarkdown ? `\n## 💡 AI Insights\n${aiData.summaryMarkdown}` : ''}
`;
  } catch (err) {
    console.warn("AI generation fallback to standard ASO template:", err.message);
    templateContent = `# ASO Audit & Strategy: ${appTitle || targetPackage}

> Generated on: ${new Date().toLocaleDateString()}
> App Package: \`${targetPackage}\` | Platform: \`${targetPlatform.toUpperCase()}\`

---

${telemetrySection}
## 🎯 1. Title & Subtitle Keywords Optimization
- [ ] **Title Keyword Placement**: Ensure high-volume target keywords appear in the primary title (first 30 characters).
- [ ] **Subtitle / Short Description**: Use compelling action verbs and top features.
- [ ] **Character Count Check**:
  - App Store Title: Max 30 chars
  - App Store Subtitle: Max 30 chars
  - Play Store Short Description: Max 80 chars

## 🖼️ 2. Visual Creative Optimization (Screenshots & Icon)
- [ ] **Icon Contrast & Clarity**: Test minimalist vs detailed icon variants.
- [ ] **First 3 Screenshots**: Focus on core value proposition in slide 1 & 2.
- [ ] **Caption Legibility**: Use bold, readable headlines above screenshots.
- [ ] **Localized Assets**: Ensure screenshots are localized for top target markets.

## ⭐ 3. Ratings, Reviews & Conversion Rate
- [ ] **In-App Rating Prompt Trigger**: Trigger prompt after key positive user actions.
- [ ] **Negative Review Outreach**: Reply to all 1-3 star reviews within 48 hours.
- [ ] **A/B Testing Hypothesis**: Set up Product Page Optimization (PPO) or Google Play Store Listing Experiment.

## 📝 4. Action Items & Notes
- Write brainstorming notes here...
`;
  }

  const now = new Date().toISOString();
  const asoNote = {
    id: `note_aso_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    title,
    content: templateContent,
    packageName: targetPackage,
    platform: targetPlatform,
    tags: ['aso', 'recommendations', 'telemetry'],
    pinned: true,
    createdAt: now,
    updatedAt: now
  };

  saveNoteToStorage(asoNote);
  res.json({ success: true, note: asoNote });
});



// Auto-detect store releases from store metadata APIs & web scrapers (per app or portfolio)
app.post("/api/releases/auto-detect", authenticate, async (req, res) => {
  const baseConfig = getBaseConfig();
  if (!baseConfig) {
    return res.json({ success: true, addedCount: 0, scannedCount: 0, message: "No base configuration found.", releases: getReleasesFromFile() });
  }

  let releases = getReleasesFromFile();
  let addedCount = 0;
  let scannedCount = 0;
  const targetPackage = req.body?.packageName;
  const targetPlatform = req.body?.platform;

  try {
    let rawProjects = await fetchPackagesByPlatform('all', baseConfig);
    if (targetPackage && targetPackage !== 'all' && targetPackage !== 'auto') {
      const normTarget = String(targetPackage).trim().toLowerCase().replace(/[-_]/g, '');
      rawProjects = rawProjects.filter(p => {
        const normPkg = String(p.packageName || '').trim().toLowerCase().replace(/[-_]/g, '');
        const normBundle = String(p.bundleId || '').trim().toLowerCase().replace(/[-_]/g, '');
        return normPkg === normTarget || normBundle === normTarget;
      });
    }
    if (targetPlatform && targetPlatform !== 'all') {
      rawProjects = rawProjects.filter(p => p.platform === targetPlatform);
    }
    scannedCount = rawProjects.length;

    for (const proj of rawProjects) {
      try {
        let versionFound = null;
        let releaseDateFound = null;
        let appTitle = proj.name || proj.packageName;

        if (proj.platform === 'apple') {
          const bundleOrId = proj.bundleId || proj.packageName;
          const appleData = await getScrapedAppleStoreData(bundleOrId);
          if (appleData?.version) {
            versionFound = appleData.version;
            releaseDateFound = appleData.updated;
            appTitle = appleData.title || appTitle;
          }
        } else {
          // 2. Google Play: Live Scraper Call
          try {
            const scraped = await gplay.app({ appId: proj.packageName });
            if (scraped && scraped.version && scraped.version !== 'Varies with device') {
              versionFound = scraped.version;
              releaseDateFound = scraped.updated;
              appTitle = scraped.title || appTitle;
            }
          } catch (e) {
            console.warn(`Play Store scrape failed for ${proj.packageName}:`, e.message);
          }

          // Fallback if live scrape failed or returned "Varies with device"
          if (!versionFound || versionFound === 'Varies with device') {
            const cached = await getScrapedPlayStoreData(proj.packageName);
            if (cached && cached.version && cached.version !== 'Varies with device') {
              versionFound = cached.version;
              releaseDateFound = releaseDateFound || cached.updated;
              appTitle = cached.title || appTitle;
            }
          }

          // Final fallback to config metadata if available
          if (!versionFound || versionFound === 'Varies with device') {
            const meta = baseConfig.appMetadata?.[proj.packageName];
            if (meta && meta.version) {
              versionFound = meta.version;
              releaseDateFound = releaseDateFound || meta.releaseDate;
              appTitle = meta.displayName || appTitle;
            }
          }
        }

        // Clean version string and format release date reliably
        if (versionFound && typeof versionFound === 'string' && versionFound !== 'Varies with device' && versionFound !== 'N/A') {
          const verStr = versionFound.startsWith('v') ? versionFound : `v${versionFound}`;

          let releaseDate = releaseDateFound;
          if (releaseDate !== null && releaseDate !== undefined) {
            let parsedDate;
            if (typeof releaseDate === 'number') {
              parsedDate = new Date(releaseDate);
            } else if (typeof releaseDate === 'string' && /^\d+$/.test(releaseDate.trim())) {
              parsedDate = new Date(Number(releaseDate.trim()));
            } else {
              parsedDate = new Date(releaseDate);
            }

            if (parsedDate && !isNaN(parsedDate.getTime())) {
              releaseDate = parsedDate.toISOString().split('T')[0];
            } else {
              releaseDate = new Date().toISOString().split('T')[0];
            }
          } else {
            releaseDate = new Date().toISOString().split('T')[0];
          }

          const normProjPkg = String(proj.packageName || '').trim().toLowerCase().replace(/[-_]/g, '');
          const exists = releases.some(r => {
            const rPkg = String(r.packageName || '').trim().toLowerCase().replace(/[-_]/g, '');
            const rPkgMatches = !r.packageName || r.packageName === 'all' || rPkg === normProjPkg;
            const rPlatMatches = !r.platform || r.platform === 'all' || r.platform === proj.platform;
            const rVerMatches = (r.version === verStr || r.version === versionFound);
            const rDateMatches = (r.date === releaseDate || r.releaseDate === releaseDate);
            return (rVerMatches || rDateMatches) && rPkgMatches && rPlatMatches;
          });

          if (!exists) {
            const newRel = {
              id: `rel_auto_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              version: verStr,
              platform: proj.platform || 'all',
              packageName: proj.packageName,
              date: releaseDate,
              releaseDate: releaseDate,
              notes: `Auto-detected store release for ${appTitle}`,
              source: 'auto'
            };
            releases.push(newRel);
            addedCount++;
          }
        }

        // 3. Scan historical report storage for past version launch dates
        if (proj.platform === 'google' && proj.packageName) {
          try {
            const googleViewer = buildGoogleViewer(baseConfig, proj.packageName);
            await googleViewer.initializeStorage();
            const bucketName = googleViewer.inputParamsModel.bucketName;
            const [files] = await googleViewer.packageUtils.authenticatedStorageObj
              .bucket(bucketName)
              .getFiles({ prefix: `stats/installs/installs_${proj.packageName}_` });

            const versionFiles = (files || []).filter(f => f.name.includes('_app_version.csv')).sort((a, b) => a.name.localeCompare(b.name));
            const firstSeenMap = new Map();

            for (const file of versionFiles) {
              try {
                const [contentBuffer] = await file.download();
                let str = contentBuffer.toString('utf16le');
                if (!str.includes('Date')) {
                  str = contentBuffer.toString('utf8');
                }
                const lines = str.split(/\r?\n/);
                for (let i = 1; i < lines.length; i++) {
                  const parts = lines[i].split(',').map(p => p.trim().replace(/\0/g, ''));
                  if (parts.length >= 3) {
                    const dateStr = parts[0];
                    const verCodeStr = parts[2];
                    if (dateStr && verCodeStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                      if (!firstSeenMap.has(verCodeStr) || dateStr < firstSeenMap.get(verCodeStr)) {
                        firstSeenMap.set(verCodeStr, dateStr);
                      }
                    }
                  }
                }
              } catch (e) {}
            }

            const normProjPkg = String(proj.packageName || '').trim().toLowerCase().replace(/[-_]/g, '');
            for (const [verCode, firstDate] of firstSeenMap.entries()) {
              const verTag = `v${verCode}`;
              const existsHist = releases.some(r => {
                const rPkg = String(r.packageName || '').trim().toLowerCase().replace(/[-_]/g, '');
                const rPkgMatches = !r.packageName || r.packageName === 'all' || rPkg === normProjPkg;
                const rVerMatches = (r.version === verTag || r.version === verCode);
                const rDateMatches = (r.date === firstDate || r.releaseDate === firstDate);
                return (rVerMatches || rDateMatches) && rPkgMatches;
              });

              if (!existsHist) {
                releases.push({
                  id: `rel_auto_hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                  version: verTag,
                  platform: 'google',
                  packageName: proj.packageName,
                  date: firstDate,
                  releaseDate: firstDate,
                  notes: `Historical release auto-detected from report data for ${appTitle} (Build ${verCode})`,
                  source: 'auto_historical'
                });
                addedCount++;
              }
            }
          } catch (histErr) {
            console.warn(`Historical report scan error for ${proj.packageName}:`, histErr.message);
          }
        }
      } catch (e) {
        console.warn(`Auto-detect process error for project ${proj.packageName}:`, e.message);
      }
    }

    releases.sort((a, b) => new Date(b.date || b.releaseDate) - new Date(a.date || a.releaseDate));
    fs.writeFileSync(RELEASES_FILE, JSON.stringify(releases, null, 2));
    resolver.clearCache('stats');

    const message = addedCount > 0
      ? `Scanned ${scannedCount} app(s). Added ${addedCount} new store version release(s).`
      : `Scanned ${scannedCount} app(s). All detected store versions are already logged.`;

    return res.json({ success: true, addedCount, scannedCount, message, releases });
  } catch (err) {
    console.error("Error auto-detecting releases:", err);
    return res.status(500).json({ error: "Failed to auto-detect store releases", details: err.message });
  }
});

// --- Notifications & Auto-Refresh Scheduler ---

// Fetch notifications list & sync with ntfy topic
app.get("/api/notifications", authenticate, async (req, res) => {
  try {
    const baseConfig = getBaseConfig() || {};
    const topic = baseConfig.ntfyTopic || process.env.NTFY_TOPIC || '';
    const data = await syncNtfyTopicMessages(DATA_DIR, topic);
    res.json(data);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications", details: error.message });
  }
});

// Clear all or specific notification
app.post("/api/notifications/clear", authenticate, (req, res) => {
  try {
    const { id } = req.body || {};
    const result = clearNotifications(DATA_DIR, id);
    res.json(result);
  } catch (error) {
    console.error("Error clearing notifications:", error);
    res.status(500).json({ error: "Failed to clear notifications", details: error.message });
  }
});

// Mark notifications as read
app.post("/api/notifications/mark-read", authenticate, (req, res) => {
  try {
    const { id } = req.body || {};
    const result = markNotificationsRead(DATA_DIR, id);
    res.json(result);
  } catch (error) {
    console.error("Error marking notifications read:", error);
    res.status(500).json({ error: "Failed to mark notifications read", details: error.message });
  }
});

// Test notification endpoint
app.post("/api/notifications/test", authenticate, async (req, res) => {
  const { title, message, priority, tags, topic } = req.body || {};
  const baseConfig = getBaseConfig() || {};
  const targetTopic = topic || baseConfig.ntfyTopic || process.env.NTFY_TOPIC;
  const result = await sendNtfyNotification({
    title: title || 'Test Notification',
    message: message || 'Hi from App Store & Play Store Stats Dashboard! ntfy setup working.',
    priority: priority || 'high',
    tags: tags || 'chart_with_upwards_trend,package',
    topic: targetTopic || '',
    dataDir: DATA_DIR
  });
  res.json(result);
});

// Manual store stats refresh & notification check endpoint
app.post("/api/refresh", authenticate, async (req, res) => {
  try {
    resolver.clearCache();
    const result = await checkAndNotifyStats(schedulerHelpers, { force: true });
    res.json(result);
  } catch (error) {
    console.error("Error running manual stats refresh:", error);
    res.status(500).json({ error: "Failed to refresh stats", details: error.message });
  }
});

// Force refresh specific date range bypassing binary search probing
app.post("/api/force-refresh-range", authenticate, async (req, res) => {
  console.log(`[FORCE SYNC] Received request to force refresh range: ${req.body.startDate} to ${req.body.endDate} (Platform: ${req.body.platform}, Package: ${req.body.packageName || req.body.projectIndex})`);
  try {
    const { startDate, endDate, platform, packageName } = req.body;
    resolver.clearCache();
    AppleAppStoreStatsViewer.earliestReleaseDateMap.clear();

    const baseConfig = getBaseConfig();
    const targetPlatform = platform || "all";
    const packages = await fetchPackagesByPlatform(targetPlatform === 'all' ? 'all' : targetPlatform, baseConfig);
    const applePackages = packages.filter(p => (p.platform === 'apple' || targetPlatform === 'apple') && (targetPlatform === 'all' || p.platform === 'apple'));
    const googlePackages = packages.filter(p => (p.platform === 'google' || targetPlatform === 'google') && (targetPlatform === 'all' || p.platform === 'google'));

    console.log(`[FORCE SYNC] Found ${applePackages.length} Apple app(s) and ${googlePackages.length} Google app(s) to process for range ${startDate} to ${endDate}...`);

    for (const pkg of applePackages) {
      try {
        console.log(`[FORCE SYNC] Bypassing binary search & clearing empty cache markers for ${pkg.packageName}...`);
        const viewer = buildAppleViewer(baseConfig, pkg.packageName);
        viewer.clearBinarySearchCache(startDate, endDate);
        if (startDate && endDate) {
          await viewer.getAppStats(startDate, endDate, { ignoreBinarySearch: true, forceRefresh: true });
        }
      } catch (err) {
        console.error(`[FORCE SYNC] Error force refreshing range for ${pkg.packageName}:`, err.message);
      }
    }

    for (const pkg of googlePackages) {
      try {
        console.log(`[FORCE SYNC] Force pulling Google Play stats for ${pkg.packageName}...`);
        const viewer = buildGoogleViewer(baseConfig, pkg.packageName);
        if (startDate && endDate) {
          await viewer.getAppStats(startDate, endDate, { force: true, forceRefresh: true });
        }
      } catch (err) {
        console.error(`[FORCE SYNC] Error force refreshing range for Google app ${pkg.packageName}:`, err.message);
      }
    }

    console.log(`[FORCE SYNC] Successfully completed force refresh for date range ${startDate} to ${endDate}.`);
    res.json({ success: true, message: `Force refreshed date range ${startDate} to ${endDate}` });
  } catch (error) {
    console.error("[FORCE SYNC] Error running force refresh date range:", error);
    res.status(500).json({ error: "Failed to force refresh date range", details: error.message });
  }
});

// Notification scheduler status & configuration endpoint
app.get("/api/notifications/status", authenticate, (req, res) => {
  const baseConfig = getBaseConfig() || {};
  const serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  res.json({
    scheduler: getSchedulerStatus(),
    config: {
      topic: baseConfig.ntfyTopic || process.env.NTFY_TOPIC || '',
      refreshIntervalHours: baseConfig.refreshIntervalHours || parseInt(process.env.STATS_REFRESH_HOURS, 10) || 1,
      statsCheckRangeDays: baseConfig.statsCheckRangeDays || parseInt(process.env.STATS_CHECK_RANGE_DAYS, 10) || 30,
      activeStartHour: baseConfig.activeStartHour !== undefined ? baseConfig.activeStartHour : (process.env.STATS_START_HOUR ? parseInt(process.env.STATS_START_HOUR, 10) : 9),
      activeEndHour: baseConfig.activeEndHour !== undefined ? baseConfig.activeEndHour : (process.env.STATS_END_HOUR ? parseInt(process.env.STATS_END_HOUR, 10) : 20),
      timezone: baseConfig.timezone || '',
      serverTimezone
    }
  });
});

// Initialize periodic background stats auto-refresh scheduler
startPeriodicScheduler(schedulerHelpers);

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Play Store Stats Dashboard Server running at http://localhost:${PORT}`);
});
