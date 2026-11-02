const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Parses and normalizes a GitHub repository URL, package URL, or slug into owner, repo, and canonical URL.
 * Handles formats:
 *   - https://github.com/owner/repo
 *   - http://github.com/owner/repo.git
 *   - github.com/owner/repo/
 *   - owner/repo
 *   - https://github.com/owner/repo/pkgs/container/package_name
 *   - https://github.com/users/owner/packages/container/package/package_name
 */
function parseGitHubUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  let cleaned = rawUrl.trim();
  // Strip protocol
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  // Strip git@github.com: prefix (SSH URLs)
  cleaned = cleaned.replace(/^git@github\.com:/i, '');
  // Strip github.com/ prefix
  cleaned = cleaned.replace(/^github\.com\//i, '');
  // Strip query params and hashes first before stripping extensions
  cleaned = cleaned.split('?')[0].split('#')[0];
  // Strip .git suffix
  cleaned = cleaned.replace(/\.git$/i, '');
  // Strip trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');

  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  // Case 1: Package URL like /users/:owner/packages/:type/package/:name
  if (parts[0].toLowerCase() === 'users' && parts.length >= 6 && parts[2].toLowerCase() === 'packages') {
    const owner = parts[1];
    const packageType = parts[3];
    const packageName = parts[5];
    return {
      owner,
      repo: packageName,
      isPackage: true,
      packageType,
      packageName,
      canonicalUrl: `https://github.com/users/${owner}/packages/${packageType}/package/${packageName}`,
      packagePageUrl: `https://github.com/users/${owner}/packages/${packageType}/package/${packageName}`
    };
  }

  // Case 2: Package URL like /:owner/:repo/pkgs/:type/:name
  if (parts.length >= 5 && (parts[2].toLowerCase() === 'pkgs' || parts[2].toLowerCase() === 'packages')) {
    const owner = parts[0];
    const repo = parts[1];
    const packageType = parts[3];
    const packageName = parts[4];
    return {
      owner,
      repo,
      isPackage: true,
      packageType,
      packageName,
      canonicalUrl: `https://github.com/${owner}/${repo}/pkgs/${packageType}/${packageName}`,
      packagePageUrl: `https://github.com/${owner}/${repo}/pkgs/${packageType}/${packageName}`
    };
  }

  const owner = parts[0];
  const repo = parts[1];

  if (!/^[a-zA-Z0-9._-]+$/.test(owner) || !/^[a-zA-Z0-9._-]+$/.test(repo)) {
    return null;
  }

  return {
    owner,
    repo,
    isPackage: false,
    canonicalUrl: `https://github.com/${owner}/${repo}`
  };
}

/**
 * Scrapes total downloads from a public GitHub package HTML page.
 * Works for GitHub Packages (container, npm, maven, docker, rubygems, etc.) without requiring auth.
 */
async function scrapePackageDownloads(packageUrl, options = {}) {
  const client = options.axiosInstance || axios;
  const timeout = options.timeout || 10000;

  try {
    const res = await client.get(packageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout,
      maxRedirects: 5
    });

    const html = res.data;
    if (typeof html === 'string') {
      const match = html.match(/Total downloads<\/span>\s*<h3[^>]*title=[\"']([0-9,]+)[\"']/i) ||
                    html.match(/Total downloads<\/span>\s*<h3[^>]*>([^<]+)<\/h3>/i);

      if (match && match[1]) {
        const num = parseInt(match[1].replace(/,/g, '').trim(), 10);
        if (!isNaN(num)) return num;
      }
    }
  } catch (err) {
    console.warn(`[GitHubTracker] Could not fetch package downloads from ${packageUrl}: ${err.message}`);
  }
  return 0;
}

/**
 * Parses total count from GitHub pagination link header (rel="last").
 */
function parseLinkHeaderTotal(linkHeader, fallbackLen = 0) {
  if (!linkHeader || typeof linkHeader !== 'string') return fallbackLen;
  const match = linkHeader.match(/page=(\d+)>;\s*rel="last"/);
  return match ? parseInt(match[1], 10) : fallbackLen;
}

/**
 * Discovers any published packages associated with a GitHub repository.
 */
async function discoverRepoPackages(owner, repo, options = {}) {
  const client = options.axiosInstance || axios;
  const timeout = options.timeout || 8000;
  const packages = [];

  try {
    const res = await client.get(`https://github.com/${owner}/${repo}/packages`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout,
      maxRedirects: 5
    });

    const html = res.data;
    if (typeof html === 'string') {
      const regex = /href=[\"'](\/(?:users\/[^\/]+\/packages\/[^\/]+\/package\/|[^\/]+\/[^\/]+\/pkgs\/[^\/]+\/)[^\"']+)[\"']/gi;
      const seen = new Set();
      let m;
      while ((m = regex.exec(html)) !== null) {
        const fullUrl = `https://github.com${m[1]}`;
        if (!seen.has(fullUrl)) {
          seen.add(fullUrl);
          packages.push(fullUrl);
        }
      }
    }
  } catch (err) {
    // Non-blocking
  }
  return packages;
}

/**
 * Fetches public repository metadata, package downloads, and release downloads from GitHub.
 */
async function fetchGitHubStats(url, options = {}) {
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    throw new Error(`Invalid GitHub repository or package URL: "${url}"`);
  }

  const { owner, repo, canonicalUrl, isPackage } = parsed;
  const token = options.token || process.env.GITHUB_TOKEN || null;

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'AppRankly-GitHubTracker/2.1'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const client = options.axiosInstance || axios;
  const timeout = options.timeout || 10000;

  // 1. Fetch main repo metadata (if available)
  let repoData = {};
  try {
    const repoRes = await client.get(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      timeout
    });
    repoData = repoRes.data || {};
  } catch (err) {
    console.warn(`[GitHubTracker] Repo metadata fetch notice for ${owner}/${repo}: ${err.message}`);
  }

  let packageDownloads = 0;
  let packageList = [];

  // If URL is explicitly a package URL (e.g. /pkgs/container/apprankly)
  if (isPackage) {
    packageDownloads = await scrapePackageDownloads(parsed.packagePageUrl, { axiosInstance: client, timeout });
    packageList.push({
      name: parsed.packageName,
      type: parsed.packageType,
      url: parsed.canonicalUrl,
      downloads: packageDownloads
    });
  }

  // 2. Fetch releases to compute asset package downloads
  let releases = [];
  try {
    const releasesRes = await client.get(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`, {
      headers,
      timeout
    });
    if (Array.isArray(releasesRes.data)) {
      releases = releasesRes.data;
    }
  } catch (err) {
    // Releases may be empty or not used
  }

  let releaseDownloads = 0;
  const assetList = [];

  for (const release of releases) {
    const assets = Array.isArray(release.assets) ? release.assets : [];
    for (const asset of assets) {
      const count = Number(asset.download_count || 0);
      releaseDownloads += count;
      assetList.push({
        releaseTag: release.tag_name || '',
        name: asset.name,
        size: asset.size,
        contentType: asset.content_type,
        downloadCount: count,
        updatedAt: asset.updated_at
      });
    }
  }

  // If repo URL was provided, also check for any published packages on the repo
  if (!isPackage) {
    const discoveredPackageUrls = await discoverRepoPackages(owner, repo, { axiosInstance: client, timeout });
    for (const pkgUrl of discoveredPackageUrls) {
      const pParsed = parseGitHubUrl(pkgUrl);
      const dls = await scrapePackageDownloads(pkgUrl, { axiosInstance: client, timeout });
      packageDownloads += dls;
      packageList.push({
        name: pParsed?.packageName || 'package',
        type: pParsed?.packageType || 'package',
        url: pkgUrl,
        downloads: dls
      });
    }
  }

  const totalDownloads = releaseDownloads + packageDownloads;

  // 3. Fetch open Pull Requests count
  let openPullRequests = 0;
  try {
    const pullsRes = await client.get(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=1`, {
      headers,
      timeout
    });
    const pullsData = Array.isArray(pullsRes.data) ? pullsRes.data : [];
    openPullRequests = parseLinkHeaderTotal(pullsRes.headers?.['link'], pullsData.length);
  } catch (err) {
    // Non-blocking
  }

  // 4. Fetch commits count and latest commit
  let totalCommits = 0;
  let latestCommit = null;
  try {
    const commitsRes = await client.get(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`, {
      headers,
      timeout
    });
    const commitsData = Array.isArray(commitsRes.data) ? commitsRes.data : [];
    totalCommits = parseLinkHeaderTotal(commitsRes.headers?.['link'], commitsData.length);
    if (commitsData.length > 0 && commitsData[0]) {
      const c = commitsData[0];
      latestCommit = {
        message: c.commit?.message ? c.commit.message.split('\n')[0] : '',
        date: c.commit?.author?.date || c.commit?.committer?.date || '',
        author: c.commit?.author?.name || c.author?.login || '',
        sha: c.sha ? c.sha.substring(0, 7) : ''
      };
    }
  } catch (err) {
    // Non-blocking
  }

  // 5. Fetch languages breakdown
  let languages = {};
  let languagePercentages = [];
  try {
    const langRes = await client.get(`https://api.github.com/repos/${owner}/${repo}/languages`, {
      headers,
      timeout
    });
    languages = langRes.data || {};
    const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + Number(bytes), 0);
    if (totalBytes > 0) {
      languagePercentages = Object.entries(languages).map(([lang, bytes]) => ({
        language: lang,
        bytes: Number(bytes),
        percentage: Number(((bytes / totalBytes) * 100).toFixed(1))
      })).sort((a, b) => b.bytes - a.bytes);
    }
  } catch (err) {
    // Non-blocking
  }

  const totalOpenIssuesAndPrs = Number(repoData.open_issues_count || 0);
  const openIssuesOnly = Math.max(0, totalOpenIssuesAndPrs - openPullRequests);

  // Sort assets by download count descending
  assetList.sort((a, b) => b.downloadCount - a.downloadCount);
  const topAssets = assetList.slice(0, 10);

  const latestRelease = releases[0] || null;
  let latestReleaseDownloads = 0;
  let latestReleaseAssets = [];

  if (latestRelease && Array.isArray(latestRelease.assets)) {
    latestReleaseAssets = latestRelease.assets.map(a => ({
      name: a.name,
      downloadCount: Number(a.download_count || 0),
      size: a.size
    }));
    latestReleaseDownloads = latestReleaseAssets.reduce((sum, a) => sum + a.downloadCount, 0);
  }

  const displayName = isPackage
    ? `${parsed.packageName} (${parsed.packageType})`
    : (repoData.name || repo);

  return {
    url: canonicalUrl,
    owner,
    repo,
    name: displayName,
    fullName: isPackage ? `${owner}/${repo}/${parsed.packageName}` : (repoData.full_name || `${owner}/${repo}`),
    description: repoData.description || (isPackage ? `GitHub ${parsed.packageType} package for ${owner}/${repo}` : ''),
    defaultBranch: repoData.default_branch || 'main',
    stars: Number(repoData.stargazers_count || 0),
    forks: Number(repoData.forks_count || 0),
    openIssues: Number(repoData.open_issues_count || 0),
    openIssuesOnly,
    openPullRequests,
    totalCommits,
    latestCommit,
    primaryLanguage: repoData.language || (languagePercentages[0]?.language || null),
    languages,
    languagePercentages,
    sizeKb: Number(repoData.size || 0),
    license: repoData.license?.spdx_id || repoData.license?.name || null,
    topics: Array.isArray(repoData.topics) ? repoData.topics : [],
    createdAt: repoData.created_at || null,
    pushedAt: repoData.pushed_at || null,
    updatedAt: repoData.updated_at || null,
    isArchived: Boolean(repoData.archived),
    networkCount: Number(repoData.network_count || repoData.forks_count || 0),
    watchers: Number(repoData.subscribers_count ?? repoData.watchers_count ?? 0),
    totalDownloads,
    releaseDownloads,
    packageDownloads,
    packages: packageList,
    isPackage: Boolean(isPackage),
    packageType: parsed.packageType || null,
    packageName: parsed.packageName || null,
    releaseCount: releases.length,
    latestRelease: latestRelease ? {
      tag: latestRelease.tag_name || '',
      name: latestRelease.name || '',
      publishedAt: latestRelease.published_at || '',
      downloads: latestReleaseDownloads,
      assets: latestReleaseAssets
    } : null,
    topAssets,
    polledAt: new Date().toISOString()
  };
}

/**
 * Saves daily snapshot to SQLite and JSON fallback.
 */
function saveDailySnapshot(stats, { db, dataDir, date = null }) {
  const currentDate = date || new Date().toISOString().split('T')[0];
  const detailsJson = JSON.stringify({
    latestRelease: stats.latestRelease,
    topAssets: stats.topAssets,
    packages: stats.packages,
    description: stats.description,
    fullName: stats.fullName,
    primaryLanguage: stats.primaryLanguage,
    languages: stats.languages,
    languagePercentages: stats.languagePercentages,
    sizeKb: stats.sizeKb,
    license: stats.license,
    topics: stats.topics,
    openPullRequests: stats.openPullRequests,
    openIssuesOnly: stats.openIssuesOnly,
    totalCommits: stats.totalCommits,
    latestCommit: stats.latestCommit,
    createdAt: stats.createdAt,
    pushedAt: stats.pushedAt,
    isArchived: stats.isArchived,
    isPackage: stats.isPackage,
    packageType: stats.packageType,
    packageName: stats.packageName,
    notifiedToday: Boolean(stats.notifiedToday)
  });

  // 1. SQLite storage
  if (db) {
    try {
      db.prepare(`
        INSERT INTO github_repos (url, owner, repo, name, description, default_branch, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(url) DO UPDATE SET
          name = excluded.name,
          description = excluded.description,
          default_branch = excluded.default_branch,
          updated_at = datetime('now')
      `).run(stats.url, stats.owner, stats.repo, stats.name, stats.description, stats.defaultBranch);

      const repoRow = db.prepare('SELECT id FROM github_repos WHERE url = ?').get(stats.url);
      const repoId = repoRow ? repoRow.id : null;

      db.prepare(`
        INSERT INTO github_repo_daily (
          repo_id, url, date, stars, forks, open_issues, watchers,
          total_downloads, release_count, latest_release_tag, latest_release_date,
          details_json, polled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(url, date) DO UPDATE SET
          repo_id = excluded.repo_id,
          stars = excluded.stars,
          forks = excluded.forks,
          open_issues = excluded.open_issues,
          watchers = excluded.watchers,
          total_downloads = excluded.total_downloads,
          release_count = excluded.release_count,
          latest_release_tag = excluded.latest_release_tag,
          latest_release_date = excluded.latest_release_date,
          details_json = excluded.details_json,
          polled_at = excluded.polled_at
      `).run(
        repoId,
        stats.url,
        currentDate,
        stats.stars || 0,
        stats.forks || 0,
        stats.openIssues || 0,
        stats.watchers || 0,
        stats.totalDownloads || 0,
        stats.releaseCount || 0,
        stats.latestRelease?.tag || null,
        stats.latestRelease?.publishedAt || null,
        detailsJson
      );
    } catch (err) {
      console.error('[GitHubTracker] Error saving to SQLite:', err.message);
    }
  }

  // 2. JSON file fallback storage
  if (dataDir) {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const jsonFile = path.join(dataDir, 'github_stats.json');
      let cache = {};
      if (fs.existsSync(jsonFile)) {
        try {
          cache = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        } catch (e) {
          cache = {};
        }
      }

      if (!cache[stats.url]) {
        cache[stats.url] = { latest: stats, history: [] };
      }

      cache[stats.url].latest = stats;

      const history = cache[stats.url].history || [];
      const existingIdx = history.findIndex(h => h.date === currentDate);
      const entry = {
        date: currentDate,
        stars: stats.stars || 0,
        forks: stats.forks || 0,
        openIssues: stats.openIssues || 0,
        watchers: stats.watchers || 0,
        totalDownloads: stats.totalDownloads || 0,
        releaseCount: stats.releaseCount || 0,
        latestReleaseTag: stats.latestRelease?.tag || null,
        details_json: detailsJson,
        polledAt: stats.polledAt
      };

      if (existingIdx >= 0) {
        history[existingIdx] = entry;
      } else {
        history.push(entry);
        history.sort((a, b) => a.date.localeCompare(b.date));
      }
      cache[stats.url].history = history;

      const tmpFile = `${jsonFile}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(cache, null, 2), 'utf8');
      fs.renameSync(tmpFile, jsonFile);
    } catch (err) {
      console.error('[GitHubTracker] Error saving JSON fallback:', err.message);
    }
  }

  return true;
}

/**
 * Retrieves historical stats for a given repo URL and computes daily growth deltas.
 */
function getRepoHistory(url, { db, dataDir, days = 30 }) {
  const parsed = parseGitHubUrl(url);
  const targetUrl = parsed ? parsed.canonicalUrl : url;

  let records = [];

  // 1. Try SQLite
  if (db) {
    try {
      records = db.prepare(`
        SELECT date, stars, forks, open_issues, watchers,
               total_downloads, release_count, latest_release_tag,
               latest_release_date, details_json, polled_at
        FROM github_repo_daily
        WHERE url = ?
        ORDER BY date ASC
      `).all(targetUrl);
    } catch (err) {
      console.warn('[GitHubTracker] DB read error:', err.message);
    }
  }

  // 2. Try JSON fallback if DB empty
  if ((!records || records.length === 0) && dataDir) {
    const jsonFile = path.join(dataDir, 'github_stats.json');
    if (fs.existsSync(jsonFile)) {
      try {
        const cache = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        const entry = cache[targetUrl];
        if (entry && Array.isArray(entry.history)) {
          records = entry.history.map(h => ({
            date: h.date,
            stars: h.stars,
            forks: h.forks,
            open_issues: h.openIssues,
            watchers: h.watchers,
            total_downloads: h.totalDownloads,
            release_count: h.releaseCount,
            latest_release_tag: h.latestReleaseTag,
            details_json: h.details_json || null,
            polled_at: h.polledAt
          }));
        }
      } catch (e) {}
    }
  }

  // Compute daily deltas
  const enriched = [];
  for (let i = 0; i < records.length; i++) {
    const current = records[i];
    const prev = i > 0 ? records[i - 1] : null;

    let details = {};
    if (current.details_json) {
      try { details = JSON.parse(current.details_json); } catch (e) {}
    }

    const dailyDownloads = prev
      ? Math.max(0, (current.total_downloads || 0) - (prev.total_downloads || 0))
      : 0;

    const dailyStars = prev
      ? (current.stars || 0) - (prev.stars || 0)
      : 0;

    enriched.push({
      date: current.date,
      stars: current.stars,
      dailyStars,
      forks: current.forks,
      openIssues: current.open_issues,
      watchers: current.watchers,
      totalDownloads: current.total_downloads,
      dailyDownloads,
      releaseCount: current.release_count,
      latestReleaseTag: current.latest_release_tag,
      latestReleaseDate: current.latest_release_date,
      polledAt: current.polled_at,
      ...details
    });
  }

  // Slice to requested days
  if (days && enriched.length > days) {
    return enriched.slice(-days);
  }
  return enriched;
}

/**
 * Normalizes the list of github repo URLs configured in config.
 * Supports string URLs and objects with url property.
 */
function getConfiguredRepos(baseConfig) {
  if (!baseConfig) return [];
  const rawList = baseConfig.githubRepos || (Array.isArray(baseConfig) ? baseConfig[0]?.githubRepos : null) || [];
  if (!Array.isArray(rawList)) return [];

  const seen = new Set();
  const normalized = [];

  for (const item of rawList) {
    const rawUrl = typeof item === 'string' ? item : (item && item.url);
    if (!rawUrl) continue;
    const parsed = parseGitHubUrl(rawUrl);
    if (parsed && !seen.has(parsed.canonicalUrl)) {
      seen.add(parsed.canonicalUrl);
      normalized.push(parsed.canonicalUrl);
    }
  }

  return normalized;
}

/**
 * Sends a notification via ntfy (and broadcast channels) when today's downloads/pulls or stars increase over previous day.
 */
async function checkAndSendGrowthNotification(stats, prevRecord, baseConfig, DATA_DIR) {
  if (!prevRecord) return false;

  const prevStars = prevRecord.stars || 0;
  const prevDownloads = prevRecord.total_downloads !== undefined ? prevRecord.total_downloads : (prevRecord.totalDownloads || 0);

  const deltaStars = Math.max(0, (stats.stars || 0) - prevStars);
  const deltaDownloads = Math.max(0, (stats.totalDownloads || 0) - prevDownloads);

  if (deltaStars <= 0 && deltaDownloads <= 0) {
    return false;
  }

  const ntfyTopic = baseConfig?.ntfyTopic || process.env.NTFY_TOPIC || '';
  const lines = [];

  if (deltaDownloads > 0) {
    lines.push(`📦 +${deltaDownloads.toLocaleString()} pull/download${deltaDownloads > 1 ? 's' : ''} (Total: ${(stats.totalDownloads || 0).toLocaleString()})`);
  }
  if (deltaStars > 0) {
    lines.push(`⭐ +${deltaStars.toLocaleString()} new star${deltaStars > 1 ? 's' : ''} (Total: ${(stats.stars || 0).toLocaleString()})`);
  }

  lines.push(`Target: ${stats.fullName || stats.name}`);
  if (prevRecord.date) {
    lines.push(`Benchmark: More than count on ${prevRecord.date}`);
  }

  let titlePrefix = '⭐📦 GitHub Growth';
  if (deltaStars > 0 && deltaDownloads === 0) {
    titlePrefix = '⭐ GitHub Star Alert';
  } else if (deltaDownloads > 0 && deltaStars === 0) {
    titlePrefix = '📦 GitHub Pull/Download Alert';
  }

  const title = `${titlePrefix}: ${stats.name}`;
  const message = lines.join('\n');

  try {
    const { broadcastAlert } = require('./notifier');
    await broadcastAlert({
      title,
      message,
      priority: 'default',
      tags: deltaStars > 0 ? 'star,chart_with_upwards_trend' : 'package,chart_with_upwards_trend',
      topic: ntfyTopic,
      dataDir: DATA_DIR,
      webhookUrl: baseConfig?.webhookUrl || process.env.WEBHOOK_URL,
      slackWebhookUrl: baseConfig?.slackWebhookUrl || process.env.SLACK_WEBHOOK_URL,
      telegram: baseConfig?.telegram
    });
    console.log(`[GitHubTracker] Sent growth notification for ${stats.name}: +${deltaStars} stars, +${deltaDownloads} pulls/downloads.`);
    return true;
  } catch (err) {
    console.warn(`[GitHubTracker] Notification error for ${stats.name}:`, err.message);
    return false;
  }
}

/**
 * Polls all configured GitHub repos daily.
 * Skips repos that have already been polled today unless `force: true`.
 */
async function pollAllConfiguredRepos({ getBaseConfig, DATA_DIR, db, force = false, token = null, axiosInstance = null }) {
  const baseConfig = typeof getBaseConfig === 'function' ? getBaseConfig() : getBaseConfig;
  const repos = getConfiguredRepos(baseConfig);
  const today = new Date().toISOString().split('T')[0];

  const authToken = token || baseConfig?.githubToken || baseConfig?.gitNotes?.password || process.env.GITHUB_TOKEN || null;

  const results = [];
  let polledCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let notificationsSent = 0;

  for (const repoUrl of repos) {
    try {
      // 1. Look up previous record prior to today
      let prevRecord = null;
      if (db) {
        try {
          prevRecord = db.prepare(`
            SELECT stars, total_downloads, date
            FROM github_repo_daily
            WHERE url = ? AND date < ?
            ORDER BY date DESC
            LIMIT 1
          `).get(repoUrl, today);
        } catch (e) {}
      }

      if (!prevRecord && DATA_DIR) {
        const jsonFile = path.join(DATA_DIR, 'github_stats.json');
        if (fs.existsSync(jsonFile)) {
          try {
            const cache = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
            const history = cache[repoUrl]?.history || [];
            const past = history.filter(h => h.date < today);
            if (past.length > 0) {
              const last = past[past.length - 1];
              prevRecord = {
                stars: last.stars,
                total_downloads: last.totalDownloads,
                date: last.date
              };
            }
          } catch (e) {}
        }
      }

      // Check if already polled today
      let alreadyPolledToday = false;
      let alreadyNotifiedToday = false;

      if (db) {
        try {
          const row = db.prepare('SELECT date, details_json FROM github_repo_daily WHERE url = ? AND date = ?').get(repoUrl, today);
          if (row) {
            alreadyPolledToday = true;
            if (row.details_json) {
              try {
                const parsed = JSON.parse(row.details_json);
                if (parsed.notifiedToday) alreadyNotifiedToday = true;
              } catch (e) {}
            }
          }
        } catch (e) {}
      }

      if (!alreadyPolledToday && DATA_DIR) {
        const jsonFile = path.join(DATA_DIR, 'github_stats.json');
        if (fs.existsSync(jsonFile)) {
          try {
            const cache = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
            const todayItem = cache[repoUrl]?.history?.find(h => h.date === today);
            if (todayItem) {
              alreadyPolledToday = true;
              if (todayItem.details_json) {
                try {
                  const parsed = JSON.parse(todayItem.details_json);
                  if (parsed.notifiedToday) alreadyNotifiedToday = true;
                } catch (e) {}
              }
            }
            if (cache[repoUrl]?.latest?.notifiedToday && cache[repoUrl]?.latest?.polledAt?.startsWith(today)) {
              alreadyNotifiedToday = true;
            }
          } catch (e) {}
        }
      }

      if (alreadyPolledToday && !force) {
        skippedCount++;
        results.push({ url: repoUrl, status: 'skipped', reason: `Already polled on ${today}` });
        continue;
      }

      console.log(`[GitHubTracker] Polling stats for ${repoUrl}...`);
      const stats = await fetchGitHubStats(repoUrl, { token: authToken, axiosInstance });

      // Check if today's count is higher than previous day -> send notification
      let notified = false;
      if (!alreadyNotifiedToday) {
        notified = await checkAndSendGrowthNotification(stats, prevRecord, baseConfig, DATA_DIR);
        if (notified) notificationsSent++;
      }
      stats.notifiedToday = notified || alreadyNotifiedToday;

      saveDailySnapshot(stats, { db, dataDir: DATA_DIR, date: today });
      polledCount++;

      const deltaStars = prevRecord ? Math.max(0, (stats.stars || 0) - (prevRecord.stars || 0)) : 0;
      const prevDl = prevRecord ? (prevRecord.total_downloads !== undefined ? prevRecord.total_downloads : prevRecord.totalDownloads) : 0;
      const deltaDownloads = prevRecord ? Math.max(0, (stats.totalDownloads || 0) - prevDl) : 0;

      results.push({
        url: repoUrl,
        status: 'polled',
        stars: stats.stars,
        totalDownloads: stats.totalDownloads,
        deltaStars,
        deltaDownloads,
        notified: Boolean(notified),
        latestRelease: stats.latestRelease?.tag || null
      });
      console.log(`[GitHubTracker] Saved ${repoUrl}: ${stats.stars} stars (+${deltaStars}), ${stats.totalDownloads} downloads (+${deltaDownloads}). Notified: ${notified}`);
    } catch (err) {
      errorCount++;
      console.error(`[GitHubTracker] Failed polling ${repoUrl}:`, err.message);
      results.push({ url: repoUrl, status: 'error', error: err.message });
    }
  }

  return {
    success: errorCount === 0 || polledCount > 0,
    totalConfigured: repos.length,
    polledCount,
    skippedCount,
    errorCount,
    notificationsSent,
    results
  };
}

/**
 * Gets summary of all configured GitHub repos with their latest stats and trends.
 */
function getTrackedReposSummary({ getBaseConfig, DATA_DIR, db, days = 30 }) {
  const baseConfig = typeof getBaseConfig === 'function' ? getBaseConfig() : getBaseConfig;
  const repos = getConfiguredRepos(baseConfig);
  const today = new Date().toISOString().split('T')[0];

  const summary = [];

  for (const repoUrl of repos) {
    const history = getRepoHistory(repoUrl, { db, dataDir: DATA_DIR, days });
    let latest = null;

    if (history.length > 0) {
      latest = history[history.length - 1];
    }

    // Try reading metadata details
    let details = {};
    if (db) {
      try {
        const row = db.prepare('SELECT description, default_branch FROM github_repos WHERE url = ?').get(repoUrl);
        if (row) details = row;
      } catch (e) {}
    }

    const parsed = parseGitHubUrl(repoUrl);
    const isPolledToday = latest ? latest.date === today : false;

    summary.push({
      url: repoUrl,
      owner: parsed?.owner || '',
      repo: parsed?.repo || '',
      isPackage: Boolean(parsed?.isPackage || latest?.isPackage),
      packageType: parsed?.packageType || latest?.packageType || null,
      packageName: parsed?.packageName || latest?.packageName || null,
      description: details.description || latest?.description || '',
      isPolledToday,
      latestDate: latest?.date || null,
      stars: latest?.stars ?? 0,
      dailyStars: latest?.dailyStars ?? 0,
      totalDownloads: latest?.totalDownloads ?? 0,
      dailyDownloads: latest?.dailyDownloads ?? 0,
      releaseDownloads: latest?.releaseDownloads ?? 0,
      packageDownloads: latest?.packageDownloads ?? 0,
      packages: latest?.packages || [],
      forks: latest?.forks ?? 0,
      openIssues: latest?.openIssues ?? 0,
      openIssuesOnly: latest?.openIssuesOnly ?? latest?.openIssues ?? 0,
      openPullRequests: latest?.openPullRequests ?? 0,
      totalCommits: latest?.totalCommits ?? 0,
      latestCommit: latest?.latestCommit || null,
      primaryLanguage: latest?.primaryLanguage || null,
      languages: latest?.languages || {},
      languagePercentages: latest?.languagePercentages || [],
      sizeKb: latest?.sizeKb ?? 0,
      license: latest?.license || null,
      topics: latest?.topics || [],
      createdAt: latest?.createdAt || null,
      pushedAt: latest?.pushedAt || null,
      isArchived: latest?.isArchived || false,
      watchers: latest?.watchers ?? 0,
      latestReleaseTag: latest?.latestReleaseTag || null,
      history
    });
  }

  return summary;
}

module.exports = {
  parseGitHubUrl,
  fetchGitHubStats,
  saveDailySnapshot,
  getRepoHistory,
  getConfiguredRepos,
  pollAllConfiguredRepos,
  getTrackedReposSummary,
  checkAndSendGrowthNotification
};

