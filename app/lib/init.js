const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { execSync } = require("child_process");

const MODEL_URL = 'https://github.com/zmsp/AppRankly/releases/download/v1.2.0/smollm2_q4.tar.gz';
const MODEL_NAME = 'HuggingFaceTB/SmolLM2-135M-Instruct';

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
  const cacheDir = path.join(DATA_DIR, "cache");
  const modelsDir = path.join(DATA_DIR, "models");

  const requiredDirs = [
    DATA_DIR,
    targetConfigDir,
    targetKeysDir,
    downloadStatsDir,
    appleStatsDir,
    path.join(DATA_DIR, "config"),
    path.join(DATA_DIR, "config", "keys"),
    cacheDir,
    modelsDir
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
        ntfyTopic: "",
        refreshIntervalHours: 1,
        statsCheckRangeDays: 30,
        activeStartHour: 9,
        activeEndHour: 20,
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

const downloadAndExtractModel = async (dataDirOption) => {
  const defaultDataDir = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, "..", "data")
    : path.join(__dirname, "..", "..", "data");
  const DATA_DIR = dataDirOption || process.env.DATA_DIR || defaultDataDir;
  const cacheDir = path.join(DATA_DIR, "cache");
  const modelsDir = path.join(DATA_DIR, "models");

  console.log(`[AI Model] Starting download process. DATA_DIR: ${DATA_DIR}`);

  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });

  const targetModelDir = path.join(modelsDir, ...MODEL_NAME.split('/'));
  const archivePath = path.join(cacheDir, 'smollm2_q4.tar.gz');

  if (fs.existsSync(targetModelDir) && fs.readdirSync(targetModelDir).length > 0) {
    console.log(`[AI Model] Model already exists at ${targetModelDir}. Skipping download.`);
    return targetModelDir;
  }

  console.log(`[AI Model] Downloading model from ${MODEL_URL} to ${archivePath}...`);
  try {
    const response = await axios({
      url: MODEL_URL,
      method: 'GET',
      responseType: 'stream',
      timeout: 300000 // 5 minutes timeout for large download
    });

    const writer = fs.createWriteStream(archivePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', (err) => {
        console.error(`[AI Model] Writer error: ${err.message}`);
        reject(err);
      });
      response.data.on('error', (err) => {
        console.error(`[AI Model] Response data error: ${err.message}`);
        reject(err);
      });
    });
    console.log(`[AI Model] Download complete. Archive size: ${fs.statSync(archivePath).size} bytes`);

    console.log(`[AI Model] Extracting model to ${targetModelDir}...`);
    if (!fs.existsSync(targetModelDir)) {
      fs.mkdirSync(targetModelDir, { recursive: true });
    }

    // Check if tar is available
    try {
      execSync(`tar -xzf "${archivePath}" -C "${targetModelDir}"`);
      console.log(`[AI Model] Extraction complete.`);
    } catch (tarErr) {
      console.error(`[AI Model] Tar extraction failed: ${tarErr.message}`);
      throw new Error(`Failed to extract model archive. Ensure 'tar' is installed. ${tarErr.message}`);
    }

    // Clean up cache
    try {
      fs.unlinkSync(archivePath);
      console.log(`[AI Model] Cleaned up archive.`);
    } catch (e) {
      console.warn(`[AI Model] Failed to delete temporary archive: ${e.message}`);
    }

    return targetModelDir;
  } catch (err) {
    console.error(`[AI Model] Download/Extract failed: ${err.message}`);
    if (fs.existsSync(archivePath)) {
      try { fs.unlinkSync(archivePath); } catch (e) {}
    }
    throw err;
  }
};

module.exports = { ensureDirectoriesAndTemplates, downloadAndExtractModel };
