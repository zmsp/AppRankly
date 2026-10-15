const crypto = require('crypto');
const dbModule = require('../db');

function generateStoreUrls({
  packageName,
  appleAppId,
  appleProviderToken,
  utmSource,
  utmMedium = 'app',
  utmCampaign,
  customProductPageId
}) {
  const cleanPkg = String(packageName || '').trim();
  const cleanSource = String(utmSource || 'direct').trim();
  const cleanMedium = String(utmMedium || 'referral').trim();
  const cleanCampaign = String(utmCampaign || 'launch').trim();

  // 1. Google Play Install Referrer URL
  // Google Play parses standard URL-encoded referrer string
  const referrerParams = `utm_source=${encodeURIComponent(cleanSource)}&utm_medium=${encodeURIComponent(cleanMedium)}&utm_campaign=${encodeURIComponent(cleanCampaign)}`;
  const playUrl = cleanPkg
    ? `https://play.google.com/store/apps/details?id=${encodeURIComponent(cleanPkg)}&referrer=${encodeURIComponent(referrerParams)}`
    : '';

  // 2. Apple App Store Campaign & Provider Token URL
  // Standard format: https://apps.apple.com/app/id{appId}?pt={pt}&ct={campaign}&mt=8
  let appleUrl = '';
  if (appleAppId) {
    const cleanAppleId = String(appleAppId).replace(/^id/i, '').trim();
    const queryParts = [];
    if (appleProviderToken) queryParts.push(`pt=${encodeURIComponent(appleProviderToken)}`);
    queryParts.push(`ct=${encodeURIComponent(cleanCampaign)}`);
    queryParts.push('mt=8');
    if (customProductPageId) {
      queryParts.push(`ppid=${encodeURIComponent(customProductPageId)}`);
    }
    appleUrl = `https://apps.apple.com/app/id${cleanAppleId}?${queryParts.join('&')}`;
  }

  return {
    playUrl,
    appleUrl,
    referrerParams
  };
}

function createCampaignSlug(name) {
  const cleanName = (name || 'link')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 20);
  const randomSuffix = crypto.randomBytes(3).toString('hex');
  return `${cleanName}-${randomSuffix}`;
}

function saveCampaignLink({
  packageName,
  platform = 'all',
  name,
  channel = 'social',
  utmSource,
  utmMedium = 'referral',
  utmCampaign,
  appleAppId,
  appleProviderToken,
  customProductPageId
}) {
  const liveDb = dbModule.db;
  if (!liveDb) throw new Error('Database unavailable');

  const { playUrl, appleUrl } = generateStoreUrls({
    packageName,
    appleAppId,
    appleProviderToken,
    utmSource,
    utmMedium,
    utmCampaign,
    customProductPageId
  });

  const slug = createCampaignSlug(name);
  const universalUrl = `/l/${slug}`;

  const stmt = liveDb.prepare(`
    INSERT INTO campaign_links (
      package_name, platform, name, slug, channel, utm_source, utm_medium, utm_campaign, apple_url, play_url, universal_url, clicks, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
  `);

  const info = stmt.run(
    packageName,
    platform,
    name,
    slug,
    channel,
    utmSource,
    utmMedium,
    utmCampaign,
    appleUrl,
    playUrl,
    universalUrl
  );

  return {
    id: info.lastInsertRowid,
    packageName,
    platform,
    name,
    slug,
    channel,
    utmSource,
    utmMedium,
    utmCampaign,
    appleUrl,
    playUrl,
    universalUrl,
    clicks: 0
  };
}

function getCampaignLinks(packageName) {
  const liveDb = dbModule.db;
  if (!liveDb) return [];

  if (packageName) {
    return liveDb.prepare(`
      SELECT * FROM campaign_links
      WHERE package_name = ?
      ORDER BY created_at DESC
    `).all(packageName);
  }

  return liveDb.prepare(`
    SELECT * FROM campaign_links
    ORDER BY created_at DESC
  `).all();
}

function deleteCampaignLink(id) {
  const liveDb = dbModule.db;
  if (!liveDb) return false;
  const result = liveDb.prepare('DELETE FROM campaign_links WHERE id = ?').run(id);
  return result.changes > 0;
}

function recordCampaignClick(slug) {
  const liveDb = dbModule.db;
  if (!liveDb || !slug) return null;
  const link = liveDb.prepare('SELECT * FROM campaign_links WHERE slug = ?').get(slug);
  if (!link) return null;

  liveDb.prepare('UPDATE campaign_links SET clicks = clicks + 1 WHERE slug = ?').run(slug);
  return liveDb.prepare('SELECT * FROM campaign_links WHERE slug = ?').get(slug);
}

module.exports = {
  generateStoreUrls,
  createCampaignSlug,
  saveCampaignLink,
  getCampaignLinks,
  deleteCampaignLink,
  recordCampaignClick
};
