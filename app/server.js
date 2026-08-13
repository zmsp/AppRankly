const express = require("express");
const util = require("util");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const rateLimit = require('express-rate-limit');

const { DATA_DIR, getActualConfigPath, getBaseConfig, invalidateConfigCache, resolveKeyFilePath } = require("./lib/config");
const { JWT_SECRET, PASSWORD_FILE, isPasswordSet, authenticate } = require("./lib/auth");
const { buildAppleViewer, buildGoogleViewer, fetchPackagesByPlatform, getIgnoredSet } = require("./lib/viewerFactory");
const { getScrapedAppleStoreData, getScrapedPlayStoreData, APPSTORE_CACHE_FILE, PLAYSTORE_CACHE_FILE } = require("./lib/scraper");
const { getReleasesFromFile, saveReleasesToFile, RELEASES_FILE } = require("./lib/releases");
const { NOTES_DIR, ensureGitNotesRepo, getNotesFromStorage, saveNoteToStorage, deleteNoteFromStorage, getNoteGitHistory, setupGitNotesRepo } = require("./lib/notes");

const AppleAppStoreStatsViewer = require("./lib/AppleAppStoreStatsViewer");
const resolver = require("./lib/resolver");
const { aggregateOverviews, matchAndPairApps, correlateReleases, calculateRetentionBenchmarks, weekdayAverages, linearForecast, fillContinuousDailyTrends } = require("./lib/metrics");
const { ensureDirectoriesAndTemplates } = require("./lib/init");
const asoRouter = require("./routes/aso");
const { sendNtfyNotification, syncNtfyTopicMessages, clearNotifications, markNotificationsRead } = require("./lib/notifier");
const { checkAndNotifyStats, startPeriodicScheduler, getSchedulerStatus } = require("./lib/scheduler");
const { calculateAppHealthScore } = require("./lib/healthScore");
const { db } = require("./lib/db");

const execFileAsync = util.promisify(execFile);

const app = express();
const PORT = process.env.PORT || 3000;

ensureDirectoriesAndTemplates(DATA_DIR);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : "*",
  methods: ["GET", "POST", "PUT", "DELETE"]
}));
app.use(express.json({ limit: "10mb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests from this IP, please try again after 15 minutes" }
});
app.use('/api/auth', authLimiter);

// --- Authentication Logic ---

app.get("/api/auth/status", (req, res) => {
  res.json({ setupRequired: !isPasswordSet() });
});

app.post("/api/auth/setup", (req, res) => {
  if (isPasswordSet()) return res.status(400).json({ error: "Setup already completed" });
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  fs.writeFileSync(PASSWORD_FILE, hash);
  res.json({ success: true });
});

app.post("/api/auth/login", (req, res) => {
  const { password } = req.body;
  let storedHash = process.env.ADMIN_PASSWORD;
  if (!storedHash && fs.existsSync(PASSWORD_FILE)) storedHash = fs.readFileSync(PASSWORD_FILE, "utf8").trim();
  if (!storedHash) return res.status(400).json({ error: "Password not set up yet. Please complete initial setup." });
  if (bcrypt.compareSync(password, storedHash)) {
    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "365d" });
    res.json({ token });
  } else {
    res.status(401).json({ error: "Invalid password" });
  }
});

app.use('/api', authenticate, asoRouter);

// --- Protected Endpoints ---

app.post("/api/store-details", authenticate, async (req, res) => {
  const { packageName, platform, cacheOnly } = req.body;
  if (!packageName) return res.status(400).json({ error: "packageName is required" });
  const isApple = platform === "apple" || platform === "ios";
  const CACHE_FILE = isApple ? APPSTORE_CACHE_FILE : PLAYSTORE_CACHE_FILE;

  let cache = {};
  try { if (fs.existsSync(CACHE_FILE)) cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")); } catch (e) {}

  const cached = cache[packageName];
  if (cacheOnly) return res.json(cached?.data || null);

  let scraped = isApple ? await getScrapedAppleStoreData(packageName) : await getScrapedPlayStoreData(packageName);
  if (!scraped && !platform) scraped = await getScrapedAppleStoreData(packageName);
  if (!scraped) return res.status(404).json({ error: "Failed to scrape store details" });
  res.json({ ...scraped, isCached: false });
});

app.get("/api/status", (req, res) => res.json({ status: "healthy", timestamp: new Date().toISOString() }));
app.get("/healthz", (req, res) => res.json({ status: "ok", version: require("./package.json").version || "1.0.0", uptime: Math.round(process.uptime()), dbOpen: true }));

app.get("/api/integrations/status", authenticate, (req, res) => {
  const baseConfig = getBaseConfig();
  res.json({
    google: { connected: !!(baseConfig?.keyJson || baseConfig?.keyFilePath), bucketName: baseConfig?.bucketName || null },
    apple: { connected: !!(baseConfig?.keyFilePath_apple && baseConfig?.appleIssuerId && baseConfig?.appleKeyId), issuerId: baseConfig?.appleIssuerId || null, keyId: baseConfig?.appleKeyId || null }
  });
});

app.get("/api/config", authenticate, (req, res) => {
  const activePath = getActualConfigPath();
  if (!fs.existsSync(activePath)) return res.status(404).json({ error: "Config file not found" });
  try { res.json({ config: JSON.parse(fs.readFileSync(activePath, "utf8")), path: activePath }); } catch (err) { res.status(500).json({ error: "Failed to read config", details: err.message }); }
});

app.put("/api/config", authenticate, (req, res) => {
  const activePath = getActualConfigPath();
  const { config } = req.body;
  if (!config) return res.status(400).json({ error: "config body is required" });
  try {
    if (fs.existsSync(activePath)) fs.writeFileSync(activePath + ".bak", fs.readFileSync(activePath));
    fs.writeFileSync(activePath, JSON.stringify(config, null, 2), "utf8");
    invalidateConfigCache();
    res.json({ success: true, path: activePath });
  } catch (err) { res.status(500).json({ error: "Failed to write config", details: err.message }); }
});

app.post("/api/notes/ai-chat", authenticate, async (req, res) => {
  const { noteTitle, noteContent, messages = [], provider, model } = req.body;
  if (!messages?.length) return res.status(400).json({ error: "Messages array is required" });
  const lastUserMsg = messages[messages.length - 1]?.content || "";
  try {
    const aiModule = require("./lib/ai");
    const aiResponse = await aiModule.generateJSON({
      provider: provider || undefined, customModel: model || undefined,
      system: "You are an expert App Store analyst named 'Rankly'. BE EXTREMELY CONCISE.",
      prompt: `=== USER SESSION CONTEXT ===\n${noteTitle || 'General Session'}\n\n=== ACTIVE CONTENT ===\n\`\`\`markdown\n${(noteContent || '').slice(0, 4000)}\n\`\`\`\n\nUser: "${lastUserMsg}"`,
      maxTokens: 1024,
      schema: { type: "object", properties: { reply: { type: "string" } }, required: ["reply"] }
    });
    res.json({ reply: aiResponse.data?.reply || "I'm sorry, I couldn't generate a response." });
  } catch (err) { res.json({ reply: `Note Assistant: Error contacting AI service (${err.message}).` }); }
});

app.post("/api/test/apple", authenticate, async (req, res) => {
  const baseConfig = getBaseConfig();
  if (!baseConfig) return res.status(400).json({ success: false, error: "No config found" });
  try {
    const apps = await buildAppleViewer(baseConfig).listPackages();
    res.json({ success: true, appCount: apps.length, apps: apps.slice(0, 5).map(a => ({ name: a.name, bundleId: a.bundleId || a.packageName })) });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

app.post("/api/test/google", authenticate, async (req, res) => {
  const baseConfig = getBaseConfig();
  if (!baseConfig) return res.status(400).json({ success: false, error: "No config found" });
  try {
    let pkgs = await buildGoogleViewer(baseConfig, 'dummy').listPackages();
    const ignoredSet = getIgnoredSet(baseConfig);
    pkgs = pkgs.filter(p => !ignoredSet.has(String(p.packageName).trim().toLowerCase()));
    res.json({ success: true, appCount: pkgs.length, apps: pkgs.slice(0, 5).map(p => ({ name: p.name, packageName: p.packageName })) });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

app.post("/api/test/ai", authenticate, async (req, res) => {
  const { provider, model, apiKey } = req.body || {};
  try {
    const response = await require("./lib/ai").generateJSON({ system: "Reply status ok.", prompt: "Ping", schema: { type: "object", properties: { status: { type: "string" } }, required: ["status"] }, provider, customModel: model, customApiKey: apiKey, maxTokens: 10 });
    res.json({ success: true, provider: response.provider, model: response.model, usage: response.usage });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

app.post("/api/test/git", authenticate, async (req, res) => {
  const { remoteUrl, branch, username, password } = req.body || {};
  const baseConfig = getBaseConfig() || {};
  const gitConfig = baseConfig.gitNotes || baseConfig.git || {};
  const targetUrl = remoteUrl || gitConfig.remoteUrl || process.env.GIT_REMOTE_URL || '';
  const targetBranch = branch || gitConfig.branch || process.env.GIT_NOTES_BRANCH || 'main';
  const targetUser = username || gitConfig.username || process.env.GIT_USERNAME || '';
  const targetPass = password || gitConfig.password || process.env.GIT_PASSWORD || process.env.GIT_TOKEN || '';
  if (!targetUrl) return res.json({ success: false, error: "Git Remote URL is empty." });
  await ensureGitNotesRepo();
  let authRemote = targetUrl;
  if (targetUser && targetPass && (authRemote.startsWith('https://') || authRemote.startsWith('http://'))) {
    const protocol = authRemote.startsWith('https://') ? 'https://' : 'http://';
    authRemote = `${protocol}${encodeURIComponent(targetUser)}:${encodeURIComponent(targetPass)}@${authRemote.replace(protocol, '')}`;
  }
  try {
    // Security: Use execFile to prevent command injection
    const { stdout } = await execFileAsync('git', ['ls-remote', authRemote, targetBranch], { cwd: NOTES_DIR, encoding: 'utf8', timeout: 15000 });
    res.json({ success: true, message: `Connected to branch "${targetBranch}".`, output: stdout.trim().split('\n')[0] });
  } catch (err) {
    const message = (err.message || '').replace(/:[^@:]+@/g, ':***@');
    res.json({ success: false, error: `Failed: ${message}` });
  }
});

app.get("/api/cache-stats", authenticate, (req, res) => res.json(resolver.getMetrics()));

app.get("/api/projects", authenticate, async (req, res) => {
  const baseConfig = getBaseConfig();
  if (!baseConfig) return res.json([]);
  const projects = await resolver.resolve('projects', {}, async () => {
    const list = [];
    try {
      let packages = await buildGoogleViewer(baseConfig, 'dummy').listPackages();
      const ignoredSet = getIgnoredSet(baseConfig);
      packages = packages.filter(p => !ignoredSet.has(String(p.packageName).trim().toLowerCase()));
      for (let idx = 0; idx < packages.length; idx++) {
        const p = packages[idx];
        const meta = baseConfig.appMetadata?.[p.packageName] || {};
        const cached = await getScrapedPlayStoreData(p.packageName);
        list.push({ index: `g-${idx}`, name: meta.displayName || cached?.title || p.name, platform: 'google', packageName: p.packageName, storeUrl: meta.storeUrl || cached?.url || `https://play.google.com/store/apps/details?id=${p.packageName}`, iconUrl: meta.iconUrl || cached?.iconUrl || `https://s2.googleusercontent.com/s2/favicons?domain=play.google.com&sz=128`, hasKey: true });
      }
    } catch (e) {}
    if (baseConfig.keyFilePath_apple) {
      try {
        const apps = await buildAppleViewer(baseConfig).listPackages();
        for (let idx = 0; idx < apps.length; idx++) {
          const a = apps[idx];
          const meta = baseConfig.appMetadata?.[a.packageName || a.bundleId] || {};
          const cached = await getScrapedAppleStoreData(a.bundleId || a.appId || a.packageName);
          list.push({ index: `a-${idx}`, name: meta.displayName || cached?.title || `${a.name} (App Store)`, platform: 'apple', packageName: a.packageName, bundleId: a.bundleId, storeUrl: meta.storeUrl || cached?.url || (a.adamId ? `https://apps.apple.com/app/id${a.adamId}` : null), iconUrl: meta.iconUrl || cached?.iconUrl || `https://s2.googleusercontent.com/s2/favicons?domain=apps.apple.com&sz=128`, hasKey: true });
        }
      } catch (e) {}
    }
    return list;
  });
  if (req.query.format === 'object') {
    const pairings = matchAndPairApps(projects.filter(p => p.platform === 'google'), projects.filter(p => p.platform === 'apple'), baseConfig);
    return res.json({ projects, pairings });
  }
  res.json(projects);
});

app.get("/api/pairings", authenticate, async (req, res) => {
  const baseConfig = getBaseConfig();
  if (!baseConfig) return res.json({ paired: [], unpairedGoogle: [], unpairedApple: [] });
  const rawProjects = await fetchPackagesByPlatform('all', baseConfig);
  res.json(matchAndPairApps(rawProjects.filter(p => p.platform === 'google'), rawProjects.filter(p => p.platform === 'apple'), baseConfig));
});

app.post("/api/stats", authenticate, async (req, res) => {
  const baseConfig = getBaseConfig();
  const { platform = "google", projectIndex = "all", packageName = "", startDate = "", endDate = "" } = req.body;
  const releases = getReleasesFromFile();
  const relHash = `${releases.length}_${releases[0]?.id || ''}`;
  const statsData = await resolver.resolve('stats', { platform, projectIndex, packageName, startDate, endDate, rel: relHash }, async () => {
    if (projectIndex === "all") {
      const packages = await fetchPackagesByPlatform(platform === 'all' ? 'all' : platform, baseConfig);
      const results = await Promise.all(packages.map(async pkg => {
        try { return { ...(await (pkg.platform === 'apple' ? buildAppleViewer(baseConfig, pkg.packageName) : buildGoogleViewer(baseConfig, pkg.packageName)).getAppStats(startDate, endDate)), packageName: pkg.packageName, displayName: pkg.name || pkg.packageName }; }
        catch (e) { return null; }
      }));
      const valid = results.filter(Boolean);
      if (!valid.length) return { dailyTrends: [], platformTotals: { apple: { totalInstalls: 0 }, google: { totalInstalls: 0 } } };
      const agg = aggregateOverviews(valid);
      agg.dailyTrends = fillContinuousDailyTrends(agg.dailyTrends || [], startDate, endDate);
      agg.weekdayAverages = weekdayAverages(agg.dailyTrends, 'dailyInstalls');
      agg.linearForecast = linearForecast(agg.dailyTrends.map(t => t.dailyInstalls || 0), 14);
      const { score, alerts, metrics } = calculateAppHealthScore(agg, {});
      return { ...agg, appHealthScore: score, appHealthAlerts: alerts, appHealthMetrics: metrics };
    } else {
      let stats;
      try { stats = await (platform === "apple" ? buildAppleViewer(baseConfig, packageName) : buildGoogleViewer(baseConfig, packageName)).getAppStats(startDate, endDate); }
      catch (e) { stats = { dailyTrends: [], appTrends: {} }; }
      stats.platform = platform;
      stats.dailyTrends = fillContinuousDailyTrends(stats.dailyTrends || [], startDate, endDate);
      stats.retentionBenchmarks = calculateRetentionBenchmarks(stats.dailyTrends);
      stats.releaseCorrelations = correlateReleases(stats.dailyTrends, releases, packageName, platform);
      stats.weekdayAverages = weekdayAverages(stats.dailyTrends, 'dailyInstalls');
      stats.linearForecast = linearForecast(stats.dailyTrends.map(t => t.dailyInstalls || 0), 14);
      const metadata = baseConfig.appMetadata?.[packageName] || {};
      const { score, alerts, metrics } = calculateAppHealthScore(stats, metadata);
      return { ...stats, appHealthScore: score, appHealthAlerts: alerts, appHealthMetrics: metrics, appMetadata: metadata };
    }
  });
  res.json(statsData);
});

app.post("/api/dimension", authenticate, async (req, res) => {
  const { dimension, projectIndex = "all", packageName = "", startDate = "", endDate = "", platform = "google" } = req.body;
  const baseConfig = getBaseConfig();
  const dimensionData = await resolver.resolve('dimension', { dimension, platform, projectIndex, packageName, startDate, endDate }, async () => {
    if (projectIndex === "all" || platform === "all") {
      const packages = await fetchPackagesByPlatform(platform === 'all' ? 'all' : platform, baseConfig);
      const results = await Promise.all(packages.map(async pkg => {
        try { return await (pkg.platform === 'apple' ? buildAppleViewer(baseConfig, pkg.packageName) : buildGoogleViewer(baseConfig, pkg.packageName)).getDimensionStats(dimension, startDate, endDate); }
        catch (e) { return null; }
      }));
      const merged = new Map();
      results.filter(Boolean).forEach(list => list.forEach(item => {
        const label = item.label || item.key || 'Unknown';
        if (!merged.has(label)) merged.set(label, { label, key: label, totalInstalls: 0, activeDevices: 0, dailyUserInstalls: 0, installs: 0 });
        const c = merged.get(label);
        c.totalInstalls += (item.totalInstalls || item.installs || 0);
        c.installs += (item.totalInstalls || item.installs || 0);
        c.activeDevices += (item.activeDevices || 0);
        c.dailyUserInstalls += (item.dailyUserInstalls || 0);
      }));
      const agg = Array.from(merged.values());
      const total = agg.reduce((s, d) => s + d.totalInstalls, 0);
      agg.forEach(d => d.percentage = total > 0 ? ((d.totalInstalls / total) * 100).toFixed(1) : '0');
      return agg.sort((a, b) => b.totalInstalls - a.totalInstalls);
    } else {
      try { return await (platform === 'apple' ? buildAppleViewer(baseConfig, packageName) : buildGoogleViewer(baseConfig, packageName)).getDimensionStats(dimension, startDate, endDate); }
      catch (e) { return []; }
    }
  });
  res.json(dimensionData);
});

app.get("/api/releases", authenticate, (req, res) => res.json(getReleasesFromFile()));
app.post("/api/releases", authenticate, (req, res) => {
  const { version, platform, packageName, date, notes, releaseDate, source } = req.body;
  const targetDate = date || releaseDate;
  if (!version || !platform || !targetDate) return res.status(400).json({ error: "Missing required fields" });
  const releases = getReleasesFromFile();
  const newRel = { id: req.body.id || `rel_${Date.now()}`, version, platform, packageName: packageName || 'all', date: targetDate, releaseDate: targetDate, notes: notes || '', source: source || 'manual' };
  releases.push(newRel);
  releases.sort((a, b) => new Date(b.date) - new Date(a.date));
  saveReleasesToFile(releases);
  res.json({ success: true, release: newRel });
});

app.put("/api/releases/:id", authenticate, (req, res) => {
  const releases = getReleasesFromFile();
  const idx = releases.findIndex(r => String(r.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  releases[idx] = { ...releases[idx], ...req.body, updatedAt: new Date().toISOString() };
  releases.sort((a, b) => new Date(b.date) - new Date(a.date));
  saveReleasesToFile(releases);
  res.json({ success: true, release: releases[idx] });
});

app.delete("/api/releases/:id", authenticate, (req, res) => {
  let releases = getReleasesFromFile();
  const initial = releases.length;
  releases = releases.filter(r => String(r.id) !== String(req.params.id));
  if (releases.length === initial) return res.status(404).json({ error: "Not found" });
  saveReleasesToFile(releases);
  res.json({ success: true });
});

app.get("/api/notes", authenticate, async (req, res) => {
  let notes = await getNotesFromStorage();
  const { packageName, platform } = req.query;
  if (packageName && packageName !== 'all') notes = notes.filter(n => n.packageName === packageName || n.packageName === 'all');
  if (platform && platform !== 'all') notes = notes.filter(n => n.platform === platform || n.platform === 'all');
  res.json(notes);
});

app.post("/api/notes", authenticate, async (req, res) => {
  const { title, content, packageName, platform, tags, pinned, skipGit } = req.body;
  const now = new Date().toISOString();
  const note = { id: req.body.id || `note_${Date.now()}`, title: title || 'Untitled Note', content: content || '', packageName: packageName || 'all', platform: platform || 'all', tags: Array.isArray(tags) ? tags : [], pinned: !!pinned, createdAt: now, updatedAt: now };
  await saveNoteToStorage(note, { skipGit: !!skipGit });
  res.json({ success: true, note });
});

app.put("/api/notes/:id", authenticate, async (req, res) => {
  const { skipGit } = req.body;
  const notes = await getNotesFromStorage();
  const existing = notes.find(n => String(n.id) === String(req.params.id));
  if (!existing) return res.status(404).json({ error: "Not found" });
  const updated = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
  await saveNoteToStorage(updated, { skipGit: !!skipGit });
  res.json({ success: true, note: updated });
});

app.delete("/api/notes/:id", authenticate, async (req, res) => {
  await deleteNoteFromStorage(req.params.id);
  res.json({ success: true });
});

app.get("/api/notes/:id/history", authenticate, async (req, res) => res.json({ success: true, history: await getNoteGitHistory(req.params.id) }));
app.post("/api/notes/setup-git", authenticate, async (req, res) => {
  try {
    const result = await setupGitNotesRepo();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/notes/:id/restore", authenticate, async (req, res) => {
  const notes = await getNotesFromStorage();
  const existing = notes.find(n => String(n.id) === String(req.params.id));
  if (!existing) return res.status(404).json({ error: "Not found" });
  const restored = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
  await saveNoteToStorage(restored);
  res.json({ success: true, note: restored });
});

app.post("/api/notes/generate-aso", authenticate, async (req, res) => {
  const { packageName = 'all', platform = 'all', appTitle, summarizedData } = req.body;
  try {
    const ai = require("./lib/ai");
    const resp = await ai.generateJSON({
      system: "ASO expert.",
      prompt: `Generate ASO note for "${appTitle || packageName}". Telemetry: ${JSON.stringify(summarizedData)}`,
      schema: { type: "object", properties: { summaryMarkdown: { type: "string" } }, required: ["summaryMarkdown"] }
    });
    const now = new Date().toISOString();
    const note = { id: `note_aso_${Date.now()}`, title: `ASO Strategy: ${appTitle || packageName}`, content: resp.data.summaryMarkdown, packageName, platform, tags: ['aso'], pinned: true, createdAt: now, updatedAt: now };
    await saveNoteToStorage(note);
    res.json({ success: true, note });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/releases/auto-detect", authenticate, async (req, res) => {
  const baseConfig = getBaseConfig();
  if (!baseConfig) return res.json({ success: true, addedCount: 0 });
  let releases = getReleasesFromFile();
  let added = 0;
  try {
    const raw = await fetchPackagesByPlatform('all', baseConfig);
    for (const p of raw) {
      const data = p.platform === 'apple' ? await getScrapedAppleStoreData(p.bundleId || p.packageName) : await getScrapedPlayStoreData(p.packageName);
      if (data?.version && !releases.some(r => r.version === data.version && r.packageName === p.packageName)) {
        releases.push({ id: `rel_auto_${Date.now()}`, version: data.version, platform: p.platform, packageName: p.packageName, date: data.updated || new Date().toISOString().split('T')[0], source: 'auto' });
        added++;
      }
    }
    saveReleasesToFile(releases);
    res.json({ success: true, addedCount: added });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/notifications", authenticate, async (req, res) => res.json(await syncNtfyTopicMessages(DATA_DIR, getBaseConfig()?.ntfyTopic || process.env.NTFY_TOPIC || '')));
app.post("/api/notifications/clear", authenticate, (req, res) => res.json(clearNotifications(DATA_DIR, req.body?.id)));
app.post("/api/notifications/mark-read", authenticate, (req, res) => res.json(markNotificationsRead(DATA_DIR, req.body?.id)));
app.post("/api/notifications/test", authenticate, async (req, res) => res.json(await sendNtfyNotification({ title: 'Test', message: 'Hello', priority: 'high', topic: req.body?.topic || getBaseConfig()?.ntfyTopic || process.env.NTFY_TOPIC || '', dataDir: DATA_DIR })));

const schedulerHelpers = { getBaseConfig, DATA_DIR, buildGoogleViewer, buildAppleViewer, fetchPackagesByPlatform };
app.post("/api/refresh", authenticate, async (req, res) => { resolver.clearCache(); res.json(await checkAndNotifyStats(schedulerHelpers, { force: true })); });

app.post("/api/force-refresh-range", authenticate, async (req, res) => {
  const { startDate, endDate, platform = "all" } = req.body;
  resolver.clearCache();
  AppleAppStoreStatsViewer.earliestReleaseDateMap.clear();
  const baseConfig = getBaseConfig();
  const pkgs = await fetchPackagesByPlatform(platform, baseConfig);
  for (const p of pkgs) {
    try {
      if (p.platform === 'apple') {
        const v = buildAppleViewer(baseConfig, p.packageName);
        v.clearBinarySearchCache(startDate, endDate);
        await v.getAppStats(startDate, endDate, { ignoreBinarySearch: true, forceRefresh: true });
      } else {
        await buildGoogleViewer(baseConfig, p.packageName).getAppStats(startDate, endDate, { force: true, forceRefresh: true });
      }
    } catch (e) { console.error(`Force refresh error for ${p.packageName}:`, e.message); }
  }
  res.json({ success: true });
});

app.get("/api/notifications/status", authenticate, (req, res) => {
  const config = getBaseConfig() || {};
  res.json({ scheduler: getSchedulerStatus(), config: { topic: config.ntfyTopic || '', refreshIntervalHours: config.refreshIntervalHours || 1, statsCheckRangeDays: config.statsCheckRangeDays || 30, activeStartHour: config.activeStartHour || 9, activeEndHour: config.activeEndHour || 20, timezone: config.timezone || '', serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone } });
});

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

ensureGitNotesRepo(true);
startPeriodicScheduler(schedulerHelpers);
app.listen(PORT, "0.0.0.0", () => console.log(`Dashboard Server running at http://localhost:${PORT}`));
