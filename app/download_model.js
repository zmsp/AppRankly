const fs = require('fs');
const path = require('path');
const axios = require('axios');

const MODEL_URL = 'https://github.com/zmsp/AppRankly/releases/download/v1.2.0/smollm2_q4.tar.gz';
const TARGET_PATH = path.join(__dirname, 'static_assets', 'smollm2_q4.tar.gz');

async function downloadModel() {
  const dir = path.dirname(TARGET_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(TARGET_PATH)) {
    console.log('Model already exists at', TARGET_PATH);
    return;
  }

  console.log('Downloading model from', MODEL_URL);
  console.log('Target path:', TARGET_PATH);

  try {
    const response = await axios({
      url: MODEL_URL,
      method: 'GET',
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(TARGET_PATH);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log('Download complete.');
        resolve();
      });
      writer.on('error', (err) => {
        console.error('Error writing file:', err.message);
        reject(err);
      });
    });
  } catch (err) {
    console.error('Failed to download model:', err.message);
    process.exit(1);
  }
}

downloadModel();
