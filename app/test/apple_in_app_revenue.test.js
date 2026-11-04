const assert = require('assert');
const crypto = require('crypto');
const axios = require('axios');
const AppleAppStoreStatsViewer = require('../lib/AppleAppStoreStatsViewer');
const { classifySalesRow } = AppleAppStoreStatsViewer;

// Column layout of a real App Store Connect daily SUMMARY sales report (v1_0).
const HEADER = ['Provider', 'Provider Country', 'SKU', 'Developer', 'Title', 'Version', 'Product Type Identifier',
  'Units', 'Developer Proceeds', 'Begin Date', 'End Date', 'Customer Currency', 'Country Code', 'Currency of Proceeds',
  'Apple Identifier', 'Customer Price', 'Promo Code', 'Parent Identifier', 'Subscription', 'Period', 'Category', 'CMB',
  'Device', 'Supported Platforms', 'Proceeds Reason', 'Preserved Pricing', 'Client', 'Order Type'];

function row(fields) {
  return HEADER.map(h => fields[h] || ' ').join('\t');
}

function report(rows) {
  return [HEADER.join('\t'), ...rows.map(row)].join('\n');
}

const APP_ID = '6816390068';
const APP_SKU = 'planner';

const DAY1 = report([
  // The app itself: one first download, two updates
  { 'SKU': APP_SKU, 'Title': 'Planner', 'Product Type Identifier': '1F', 'Units': '1', 'Developer Proceeds': '0.00', 'Begin Date': '10/09/2026', 'Apple Identifier': APP_ID },
  { 'SKU': APP_SKU, 'Title': 'Planner', 'Product Type Identifier': '7F', 'Units': '2', 'Developer Proceeds': '0.00', 'Begin Date': '10/09/2026', 'Apple Identifier': APP_ID },
  // Its one-time in-app purchase: own Apple Identifier, parent = the app's SKU
  { 'SKU': 'planner.pro', 'Title': 'Planner Pro', 'Product Type Identifier': 'IA1', 'Units': '1', 'Developer Proceeds': '3.85', 'Begin Date': '10/09/2026', 'Apple Identifier': '6816393311', 'Parent Identifier': APP_SKU },
  // Another app's subscription must not be counted
  { 'SKU': 'other.monthly', 'Title': 'Other Cloud', 'Product Type Identifier': 'IAY', 'Units': '1', 'Developer Proceeds': '3.56', 'Begin Date': '10/09/2026', 'Apple Identifier': '6754044798', 'Parent Identifier': 'OTHER-SKU' },
]);

const DAY2 = report([
  // Only a subscription renewal of the app, no row for the app itself on this day
  { 'SKU': 'planner.monthly', 'Title': 'Planner Monthly', 'Product Type Identifier': 'IAY', 'Units': '2', 'Developer Proceeds': '1.50', 'Begin Date': '10/10/2026', 'Apple Identifier': '6816393400', 'Parent Identifier': APP_SKU, 'Subscription': 'Renewal' },
]);

function testClassifySalesRow() {
  const skus = new Set([APP_SKU]);
  assert.strictEqual(classifySalesRow({ 'Apple Identifier': APP_ID }, APP_ID, skus), 'app');
  assert.strictEqual(classifySalesRow({ 'Apple Identifier': '1', 'Parent Identifier': APP_SKU }, APP_ID, skus), 'in_app');
  assert.strictEqual(classifySalesRow({ 'Apple Identifier': '1', 'Parent Identifier': 'OTHER-SKU' }, APP_ID, skus), null);
  assert.strictEqual(classifySalesRow({ 'Apple Identifier': '1', 'Parent Identifier': ' ' }, APP_ID, skus), null, 'a blank parent never matches');
}

function makeViewer(pem) {
  const viewer = new AppleAppStoreStatsViewer({ issuerId: `issuer-${Date.now()}-${Math.random()}`, keyId: 'KEY', privateKey: pem, appId: APP_ID, vendorId: 'V' });
  viewer.fetchDailySalesReport = async (dateStr) => ({ '2026-10-09': DAY1, '2026-10-10': DAY2 }[dateStr] || '__EMPTY__');
  return viewer;
}

async function testGetAppStatsCountsInAppRevenue() {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const originalGet = axios.get;
  const originalWarn = console.warn;
  try {
    // Case 1: the API returns the SKU
    let skuCalls = 0;
    axios.get = async (url) => {
      assert.ok(url.includes(`/v1/apps/${APP_ID}`), `unexpected URL ${url}`);
      skuCalls++;
      return { data: { data: { id: APP_ID, attributes: { sku: APP_SKU } } } };
    };
    const stats = await makeViewer(pem).getAppStats('2026-10-09', '2026-10-10');
    const byDate = Object.fromEntries(stats.dailyTrends.map(t => [t.date, t]));
    assert.strictEqual(skuCalls, 1, 'the SKU must come from the stubbed API');
    assert.strictEqual(byDate['2026-10-09'].dailyInstalls, 1, 'in-app purchases must not count as installs');
    assert.strictEqual(byDate['2026-10-09'].upgrades, 2);
    assert.strictEqual(byDate['2026-10-09'].revenue.toFixed(2), '3.85', 'the app\'s purchase counts, the other app\'s subscription does not');
    assert.strictEqual(byDate['2026-10-10'].revenue.toFixed(2), '3.00', 'a renewal on a day without app rows still counts');
    assert.strictEqual(stats.totalRevenue.toFixed(2), '6.85');
    assert.strictEqual(stats.totalInstallCountByUser, 1);

    // Case 2: the API call fails; the SKU seen in the app's own rows still links the purchase (with a warning)
    const warnings = [];
    console.warn = (msg) => warnings.push(String(msg));
    axios.get = async () => { const e = new Error('Forbidden'); e.response = { status: 403 }; throw e; };
    const fallback = await makeViewer(pem).getAppStats('2026-10-09', '2026-10-10');
    assert.strictEqual(fallback.totalRevenue.toFixed(2), '6.85');
    assert.ok(warnings.some(w => w.includes('Could not read SKU')), 'the fallback must be logged');
  } finally {
    axios.get = originalGet;
    console.warn = originalWarn;
  }
}

(async () => {
  console.log('Running Apple in-app purchase revenue tests...');
  testClassifySalesRow();
  await testGetAppStatsCountsInAppRevenue();
  console.log('✓ Apple in-app purchase revenue tests passed (2 of 2)');
  process.exit(0);
})().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
