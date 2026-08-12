const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

const MODEL_URL = 'https://github.com/zmsp/AppRankly/releases/download/v1.2.0/smollm2_q4.tar.gz';
const MODEL_NAME = 'HuggingFaceTB/SmolLM2-135M-Instruct';

const DATA_DIR = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? path.join(__dirname, 'data') : path.join(__dirname, '..', 'data'));
const MODELS_DIR = path.join(DATA_DIR, 'models');
const TARGET_DIR = path.join(MODELS_DIR, ...MODEL_NAME.split('/'));
const CACHE_DIR = path.join(DATA_DIR, 'cache');
const ARCHIVE_PATH = path.join(CACHE_DIR, 'smollm2_q4.tar.gz');

async function downloadModel() {
  if (fs.existsSync(TARGET_DIR) && fs.readdirSync(TARGET_DIR).length > 0) {
    console.log('Model already exists at', TARGET_DIR);
    return;
  }

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  if (!fs.existsSync(ARCHIVE_PATH)) {
    console.log('Downloading model from', MODEL_URL);
    console.log('Target archive:', ARCHIVE_PATH);

    try {
      const response = await axios({
        url: MODEL_URL,
        method: 'GET',
        responseType: 'stream'
      });

      const writer = fs.createWriteStream(ARCHIVE_PATH);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      console.log('Download complete.');
    } catch (err) {
      console.error('Failed to download model:', err.message);
      process.exit(1);
    }
  }

  console.log(`Extracting model to ${TARGET_DIR}...`);
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  try {
    execSync(`tar -xzf "${ARCHIVE_PATH}" -C "${TARGET_DIR}"`);
    console.log('Extraction complete.');

    // Clean up cache
    try {
      fs.unlinkSync(ARCHIVE_PATH);
    } catch (e) {}
  } catch (err) {
    console.error('Failed to extract model:', err.message);
    process.exit(1);
  }
}

downloadModel();
