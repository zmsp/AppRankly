const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Credentials come from the project's live config (data/config/config.json).
const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'config', 'config.json'), 'utf8')
)[0];

const KEY_ID = config.appleKeyId;
const ISSUER_ID = config.appleIssuerId;
// Sales reports require the vendor number (App Store Connect > Payments and
// Financial Reports, top-left). Set it in config as "appleVendorId" or via env.
const VENDOR_NUMBER = process.env.APPLE_VENDOR_NUMBER || config.appleVendorId;
const PRIVATE_KEY_PATH = path.join(__dirname, '..', 'data', 'config', config.keyFilePath_apple);

const DATA_DIR = path.join(__dirname, 'data');

function generateJWT() {
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  return jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    expiresIn: '20m',
    issuer: ISSUER_ID,
    audience: 'appstoreconnect-v1',
    header: { kid: KEY_ID },
  });
}

function getYesterdayStr() {
  const yesterday = new Date(Date.now() - 86400000);
  const yyyy = yesterday.getFullYear();
  const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
  const dd = String(yesterday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getLastMonthStr() {
  const lastMonth = new Date();
  lastMonth.setDate(1);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
}

async function downloadReport() {
  if (!VENDOR_NUMBER) {
    console.error('Missing vendor number. Add "appleVendorId" to data/config/config.json or set APPLE_VENDOR_NUMBER.');
    process.exit(1);
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const token = generateJWT();

  const reportType = (process.env.REPORT_TYPE || 'SALES').toUpperCase();
  const url = 'https://api.appstoreconnect.apple.com/v1/salesReports';

  let params = {};
  let defaultDate = '';

  if (reportType === 'INSTALLS') {
    defaultDate = getLastMonthStr();
    params = {
      'filter[vendorNumber]': VENDOR_NUMBER,
      'filter[reportType]': 'INSTALLS',
      'filter[reportSubType]': process.env.REPORT_SUBTYPE || 'DETAILED',
      'filter[frequency]': process.env.FREQUENCY || 'MONTHLY',
      'filter[version]': '1_2',
    };
  } else {
    defaultDate = getYesterdayStr();
    params = {
      'filter[vendorNumber]': VENDOR_NUMBER,
      'filter[reportType]': 'SALES',
      'filter[reportSubType]': process.env.REPORT_SUBTYPE || 'SUMMARY',
      'filter[frequency]': process.env.FREQUENCY || 'DAILY',
      'filter[version]': '1_0',
    };
  }

  const reportDate = process.env.REPORT_DATE || defaultDate;
  params['filter[reportDate]'] = reportDate;

  console.log(`Fetching ${reportType} report from App Store Connect...`);
  console.log('Parameters:', params);

  const filenamePrefix = reportType === 'INSTALLS' ? 'installs_report' : `sales_report_${reportDate}`;
  const gzPath = path.join(DATA_DIR, `${filenamePrefix}.txt.gz`);
  const txtPath = path.join(DATA_DIR, `${filenamePrefix}.txt`);

  try {
    const response = await axios({
      method: 'get',
      url,
      params,
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(gzPath);
    response.data.pipe(writer);

    writer.on('finish', () => {
      console.log(`Download complete! Saved as ${gzPath}`);
      fs.createReadStream(gzPath)
        .pipe(zlib.createGunzip())
        .pipe(fs.createWriteStream(txtPath))
        .on('finish', () => console.log(`Extracted report to ${txtPath}`));
    });

    writer.on('error', (err) => console.error('Error writing file:', err));
  } catch (error) {
    if (error.response && error.response.data) {
      if (typeof error.response.data.on === 'function') {
        error.response.data.on('data', (chunk) => {
          console.error('API Error details:', chunk.toString());
        });
      } else {
        console.error('API Error status:', error.response.status, error.response.data);
      }
    } else {
      console.error('Error connecting to API:', error.message);
    }
  }
}

downloadReport();
