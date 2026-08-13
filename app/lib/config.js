const path = require("path");
const fs = require("fs");
const resolver = require("./resolver");

const DATA_DIR = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? path.join(__dirname, "..", "data") : path.join(__dirname, "..", "..", "data"));
const configFilePath = process.env.CONFIG_PATH || path.join(DATA_DIR, "config", "config.json");

let _configCache = null;
let _configCacheTime = 0;
let _configCacheMTime = 0;

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
  const legacyPath = path.join(__dirname, "..", "..", "config", "config.json");
  if (fs.existsSync(legacyPath)) {
    return legacyPath;
  }
  const appConfigPath = path.join(__dirname, "..", "config", "config.json");
  if (fs.existsSync(appConfigPath)) {
    return appConfigPath;
  }
  console.warn(`No config file found! Tried: ${defaultPath}, ${dataConfigPath}, ${rootDataConfigPath}, ${legacyPath}, ${appConfigPath}`);
  return defaultPath;
};

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
    path.join(__dirname, "..", "..", "config"),
    path.join(__dirname, "..", "config")
  ];

  for (const baseDir of searchDirs) {
    const resolvedPath = path.isAbsolute(keyPath) ? keyPath : path.join(baseDir, keyPath);
    if (fs.existsSync(resolvedPath)) {
       const relativeToData = path.relative(DATA_DIR, resolvedPath);
       const relativeToConfig = path.relative(path.join(__dirname, "..", "..", "config"), resolvedPath);
       const relativeToAppConfig = path.relative(path.join(__dirname, "..", "config"), resolvedPath);
       const relativeToActiveConfig = path.relative(activeConfigDir, resolvedPath);

       const isSafe = (relativeToData && !relativeToData.startsWith('..')) ||
                      (relativeToConfig && !relativeToConfig.startsWith('..')) ||
                      (relativeToAppConfig && !relativeToAppConfig.startsWith('..')) ||
                      (relativeToActiveConfig && !relativeToActiveConfig.startsWith('..'));

       if (isSafe) {
         return resolvedPath;
       }
    }
  }
  return null;
};

module.exports = {
  DATA_DIR,
  getActualConfigPath,
  getBaseConfig,
  invalidateConfigCache,
  resolveKeyFilePath
};
