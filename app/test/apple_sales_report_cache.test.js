const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');
const AppleAppStoreStatsViewer = require('../lib/AppleAppStoreStatsViewer');

// A date older than the two-day repull window: once a negative cache entry exists for it,
// fetchDailySalesReport never asks Apple again.
const OLD_DATE = '2026-07-15';

function makeViewer(pem, dataDir) {
  return new AppleAppStoreStatsViewer({
    issuerId: 'issuer', keyId: 'KEY', privateKey: pem, appId: '1',
    vendorId: `vendor-${Date.now()}-${Math.random()}`, dataDir
  });
}

async function fetchWithStatus(pem, status) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apprankly-sales-'));
  const viewer = makeViewer(pem, dataDir);
  let calls = 0;
  axios.defaults.adapter = async (config) => {
    calls++;
    const err = new Error(`Request failed with status code ${status}`);
    err.config = config;
    err.response = { status, data: Buffer.from('{}'), headers: {}, config };
    throw err;
  };
  const result = await viewer.fetchDailySalesReport(OLD_DATE);
  const cacheFile = path.join(dataDir, 'download_stats', 'apple', `sales_${OLD_DATE}.txt`);
  const cached = fs.existsSync(cacheFile) ? fs.readFileSync(cacheFile, 'utf8') : undefined;
  fs.rmSync(dataDir, { recursive: true, force: true });
  return { result, calls, cached, viewer };
}

async function testSalesReportNegativeCache() {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const originalAdapter = axios.defaults.adapter;
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    // 404 means "no sales on this date": the negative cache entry is correct and stays.
    const notFound = await fetchWithStatus(pem, 404);
    assert.strictEqual(notFound.calls, 1, 'the stubbed API must have been called');
    assert.strictEqual(notFound.result, null);
    assert.strictEqual(notFound.cached, '__EMPTY__');

    // 400/403 are about the vendor or the key, not about the date. Caching them as an
    // empty day would hide that day's sales permanently once the key works again.
    for (const status of [400, 403]) {
      const denied = await fetchWithStatus(pem, status);
      assert.strictEqual(denied.calls, 1, `the stubbed API must have been called (${status})`);
      assert.strictEqual(denied.result, null);
      assert.strictEqual(denied.cached, undefined, `HTTP ${status} must not write a negative cache entry`);
      assert.ok(AppleAppStoreStatsViewer.disabledVendors.has(denied.viewer.vendorId), `HTTP ${status} still disables the vendor`);
    }
  } finally {
    axios.defaults.adapter = originalAdapter;
    console.warn = originalWarn;
  }
}

(async () => {
  console.log('Running Apple sales report cache tests...');
  await testSalesReportNegativeCache();
  console.log('✓ Apple sales report cache tests passed (3 of 3)');
  process.exit(0);
})().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
