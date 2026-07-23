const fs = require("fs");
const path = require("path");

const ensureDirectoriesAndTemplates = (dataDirOption, configPathOption) => {
  const defaultDataDir = process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, "..", "data") 
    : path.join(__dirname, "..", "..", "data");
    
  const DATA_DIR = dataDirOption || process.env.DATA_DIR || defaultDataDir;
  const targetConfigPath = configPathOption || process.env.CONFIG_PATH || path.join(DATA_DIR, "config", "config.json");
  const targetConfigDir = path.dirname(targetConfigPath);
  const targetKeysDir = path.join(targetConfigDir, "keys");
  const downloadStatsDir = path.join(DATA_DIR, "download_stats");
  const appleStatsDir = path.join(DATA_DIR, "apple_stats");

  const requiredDirs = [
    DATA_DIR,
    targetConfigDir,
    targetKeysDir,
    downloadStatsDir,
    appleStatsDir,
    path.join(DATA_DIR, "config"),
    path.join(DATA_DIR, "config", "keys")
  ];

  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[Init] Created directory: ${dir}`);
      } catch (err) {
        console.error(`[Init] Failed to create directory ${dir}:`, err.message);
      }
    }
  }

  // Check if any config.json file already exists across candidate paths
  const candidateConfigPaths = [
    targetConfigPath,
    path.join(DATA_DIR, "config.json"),
    path.join(DATA_DIR, "config", "config.json"),
    path.join(__dirname, "..", "..", "config", "config.json"),
    path.join(__dirname, "..", "config", "config.json")
  ];

  const existingConfig = candidateConfigPaths.find(p => fs.existsSync(p));

  if (!existingConfig) {
    const templateConfig = [
      {
        name: "My App Project",
        projectID: "your-gcp-project-id",
        bucketName: "pubsite_prod_12345678",
        keyFilePath: "keys/google_key.json",
        keyFilePath_apple: "keys/apple_key.p8",
        appleIssuerId: "xxxx-xxxx-xxxx-xxxx",
        appleKeyId: "XXXXXXXXXX",
        appleVendorId: "12345678",
        PlaystoreConsoleUrl: "https://play.google.com/console",
        appMetadata: {},
        ignoredPackages: [],
        ai: {
          defaultProvider: "openai",
          providers: {
            openai: {
              apiKey: "",
              model: "gpt-4.1-nano"
            },
            anthropic: {
              apiKey: "",
              model: "claude-3-5-sonnet-20241022"
            },
            gemini: {
              apiKey: "",
              model: "gemini-3.6-flash"
            }
          }
        }
      }
    ];

    try {
      fs.writeFileSync(targetConfigPath, JSON.stringify(templateConfig, null, 2), "utf8");
      console.log(`[Init] Created default template config file at: ${targetConfigPath}`);
    } catch (err) {
      console.error(`[Init] Failed to create template config file at ${targetConfigPath}:`, err.message);
    }
  }
};

module.exports = { ensureDirectoriesAndTemplates };
