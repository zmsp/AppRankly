const assert = require('assert');
const crypto = require('crypto');
const axios = require('axios');
const AppleAppStoreStatsViewer = require('../lib/AppleAppStoreStatsViewer');
const { selectAppByBundleId } = AppleAppStoreStatsViewer;

// App Store Connect answers filter[bundleId]=com.example.calc with every app whose
// bundle ID starts with it. The order is not guaranteed; the exact match is not first here.
const PREFIX_RESPONSE = [
  { id: '300', attributes: { bundleId: 'com.example.calc.stats', sku: 'calc-stats' } },
  { id: '100', attributes: { bundleId: 'com.example.calc', sku: 'calc' } },
  { id: '200', attributes: { bundleId: 'com.example.calc.pro', sku: 'calc-pro' } },
];

async function testSelectAppByBundleId() {
  assert.strictEqual(selectAppByBundleId(PREFIX_RESPONSE, 'com.example.calc').id, '100');
  assert.strictEqual(selectAppByBundleId(PREFIX_RESPONSE, 'com.example.calc.pro').id, '200');
  assert.strictEqual(selectAppByBundleId(PREFIX_RESPONSE, 'COM.Example.Calc').id, '100', 'bundle IDs compare case-insensitively');
  assert.strictEqual(selectAppByBundleId(PREFIX_RESPONSE, 'com.example'), null, 'a prefix of a bundle ID is not a match');
  assert.strictEqual(selectAppByBundleId([], 'com.example.calc'), null);
  assert.strictEqual(selectAppByBundleId(undefined, 'com.example.calc'), null);
  assert.strictEqual(selectAppByBundleId(PREFIX_RESPONSE, ''), null);
}

async function testGetNumericAppIdUsesExactMatch() {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  // Unique bundle IDs per run so the resolver cache cannot answer instead of the stubbed API.
  const run = `t${Date.now()}`;
  const response = PREFIX_RESPONSE.map(a => ({ ...a, attributes: { ...a.attributes, bundleId: a.attributes.bundleId.replace('example', run) } }));

  const originalGet = axios.get;
  const requested = [];
  axios.get = async (url) => {
    requested.push(url);
    return { data: { data: response } };
  };
  try {
    const viewer = new AppleAppStoreStatsViewer({
      issuerId: `issuer-${run}`, keyId: 'KEY', privateKey: pem, appId: `com.${run}.calc`,
    });
    assert.strictEqual(await viewer.getNumericAppId(), '100', 'must resolve to the exact bundle ID, not the first result');
    assert.strictEqual(requested.length, 1, 'the stubbed App Store Connect API must have been called');

    const missing = new AppleAppStoreStatsViewer({
      issuerId: `issuer-${run}`, keyId: 'KEY', privateKey: pem, appId: `com.${run}.calc.lite`,
    });
    await assert.rejects(() => missing.getNumericAppId(), /Could not find Apple app with bundle ID/,
      'only prefix matches must not resolve to another app');
  } finally {
    axios.get = originalGet;
  }
}

(async () => {
  console.log('Running Apple bundle ID resolution tests...');
  await testSelectAppByBundleId();
  await testGetNumericAppIdUsesExactMatch();
  console.log('✓ Apple bundle ID resolution tests passed (2 of 2)');
  process.exit(0);
})().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
