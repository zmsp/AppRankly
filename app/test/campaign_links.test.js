const assert = require('assert');
const { generateStoreUrls, createCampaignSlug, saveCampaignLink, getCampaignLinks, deleteCampaignLink, recordCampaignClick } = require('../lib/aso/campaignLinks');

console.log('Testing Zero-SDK Campaign Link Builder...');

// 1. URL generator tests
const urls = generateStoreUrls({
  packageName: 'com.example.fit',
  appleAppId: '1234567890',
  appleProviderToken: '987654',
  utmSource: 'twitter',
  utmMedium: 'social',
  utmCampaign: 'launch_thread'
});

assert(urls.playUrl.includes('referrer=utm_source%3Dtwitter'), 'Google Play URL should include encoded referrer params');
assert(urls.appleUrl.includes('pt=987654'), 'Apple URL should include provider token');
assert(urls.appleUrl.includes('ct=launch_thread'), 'Apple URL should include campaign token');

// 2. Slug generation
const slug = createCampaignSlug('Reddit r/Fitness Thread');
assert(slug.startsWith('reddit-r-fitness-'), 'Slug should be URL sanitized');

// 3. Database persistence operations
const created = saveCampaignLink({
  packageName: 'com.example.fit',
  platform: 'all',
  name: 'Test Campaign',
  channel: 'newsletter',
  utmSource: 'substack',
  utmMedium: 'email',
  utmCampaign: 'october_issue',
  appleAppId: '1234567890'
});

assert(created.id, 'Should return created campaign row ID');
assert.strictEqual(created.clicks, 0, 'Initial clicks should be 0');

const links = getCampaignLinks('com.example.fit');
assert(links.length > 0, 'Should retrieve saved campaign links for package');

// 4. Click tracking test
const clicked = recordCampaignClick(created.slug);
assert(clicked, 'Should find campaign by slug');
assert.strictEqual(clicked.clicks, 1, 'Clicks should increment to 1');

// 5. Deletion test
const deleted = deleteCampaignLink(created.id);
assert.strictEqual(deleted, true, 'Should successfully delete link');

console.log('✓ All Zero-SDK Campaign Link Builder tests passed successfully!');
