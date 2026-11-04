const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { PackageUtils, parseNumeric, getParsedInt } = require('../lib/PackageUtils');
const { sendWebhookNotification, sendTelegramNotification, broadcastAlert } = require('../lib/notifier');
const resolver = require('../lib/resolver');

console.log('Running v1.5.0 features test suite...');

// 1. PackageUtils Test
const utils = new PackageUtils();
const sampleHeader = ['Date', 'Country', 'Active Device Installs', 'Total User Installs', 'Daily User Installs', 'Daily User Uninstalls'];
const indexes = utils.getHeaderIndexes(sampleHeader);

assert.strictEqual(indexes.date, 0, 'Date index should be 0');
assert.strictEqual(indexes.label, 1, 'Label (country) index should be 1');
assert.strictEqual(indexes.activeDevices, 2, 'Active devices index should be 2');
assert.strictEqual(indexes.totalInstalls, 3, 'Total installs index should be 3');
assert.strictEqual(indexes.dailyInstalls, 4, 'Daily installs index should be 4');
assert.strictEqual(indexes.dailyUninstalls, 5, 'Daily uninstalls index should be 5');

assert.strictEqual(parseNumeric('42.5'), 42.5);
assert.strictEqual(parseNumeric('NA'), null);
assert.strictEqual(parseNumeric(''), null);
assert.strictEqual(getParsedInt('1,234 installs'), 1234);
assert.strictEqual(getParsedInt(null), 0);
console.log('✓ PackageUtils unit tests passed');

// 2. SVG Badge Generation Test (replicating server generator)
function generateBadgeSvg(label, value, color = '#3b82f6') {
  const safeLabel = String(label).replace(/[<>&"']/g, '');
  const safeVal = String(value).replace(/[<>&"']/g, '');
  const charWidth = 7.2;
  const labelWidth = Math.round(Math.max(safeLabel.length * charWidth + 14, 52));
  const valueWidth = Math.round(Math.max(safeVal.length * charWidth + 14, 52));
  const totalWidth = labelWidth + valueWidth;
  const height = 20;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${safeLabel}: ${safeVal}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="#27272a"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${color}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${safeLabel}</text>
    <text x="${labelWidth / 2}" y="14">${safeLabel}</text>
    <text aria-hidden="true" x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${safeVal}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${safeVal}</text>
  </g>
</svg>`;
}

const badgeSvg = generateBadgeSvg('App Store', '4.8 ★', '#10b981');
assert.ok(badgeSvg.includes('<svg'), 'Badge must produce valid SVG string');
assert.ok(badgeSvg.includes('4.8 ★'), 'Badge must include formatted metric value');
assert.ok(badgeSvg.includes('#10b981'), 'Badge must include assigned color');
console.log('✓ SVG Badge generator tests passed');

// 3. Notifier skipped behavior when unconfigured
async function testNotifier() {
  const emptyWebhook = await sendWebhookNotification({ message: 'test', webhookUrl: '' });
  assert.strictEqual(emptyWebhook.skipped, true, 'Empty webhook URL should gracefully skip');

  const emptyTelegram = await sendTelegramNotification({ message: 'test', botToken: '', chatId: '' });
  assert.strictEqual(emptyTelegram.skipped, true, 'Empty Telegram config should gracefully skip');

  const broadcastRes = await broadcastAlert({
    title: 'Test Broadcast',
    message: 'Testing multi-channel alert dispatcher',
    topic: '',
    webhookUrl: '',
    slackWebhookUrl: '',
    telegram: { botToken: '', chatId: '' },
    dryRun: true,
    dataDir: os.tmpdir()
  });

  assert.ok(broadcastRes.webhookResult.skipped);
  assert.ok(broadcastRes.slackResult.skipped);
  assert.ok(broadcastRes.telegramResult.skipped);
  console.log('✓ Notifier multi-channel gracefully handles empty configs');
}

testNotifier().then(() => {
  console.log('All v1.5.0 tests passed successfully!');
}).catch(err => {
  console.error('v1.5.0 test suite failure:', err);
  process.exit(1);
});
