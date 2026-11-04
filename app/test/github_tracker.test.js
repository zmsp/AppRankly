const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const {
  parseGitHubUrl,
  fetchGitHubStats,
  saveDailySnapshot,
  getRepoHistory,
  getConfiguredRepos,
  pollAllConfiguredRepos,
  getTrackedReposSummary
} = require('../lib/githubTracker');

console.log('Testing GitHub Repository Tracking & Daily Polling Engine...');

// 1. URL Parsing Tests
console.log('Testing parseGitHubUrl...');
{
  const testCases = [
    { input: 'https://github.com/facebook/react', expected: { owner: 'facebook', repo: 'react', canonicalUrl: 'https://github.com/facebook/react' } },
    { input: 'https://github.com/facebook/react.git', expected: { owner: 'facebook', repo: 'react', canonicalUrl: 'https://github.com/facebook/react' } },
    { input: 'https://github.com/facebook/react/', expected: { owner: 'facebook', repo: 'react', canonicalUrl: 'https://github.com/facebook/react' } },
    { input: 'http://github.com/facebook/react', expected: { owner: 'facebook', repo: 'react', canonicalUrl: 'https://github.com/facebook/react' } },
    { input: 'github.com/facebook/react', expected: { owner: 'facebook', repo: 'react', canonicalUrl: 'https://github.com/facebook/react' } },
    { input: 'facebook/react', expected: { owner: 'facebook', repo: 'react', canonicalUrl: 'https://github.com/facebook/react' } },
    { input: 'https://github.com/facebook/react?utm_source=test#readme', expected: { owner: 'facebook', repo: 'react', canonicalUrl: 'https://github.com/facebook/react' } },
    { input: 'https://github.com/facebook/react.git?utm_source=test#readme', expected: { owner: 'facebook', repo: 'react', canonicalUrl: 'https://github.com/facebook/react' } },
    { input: 'git@github.com:facebook/react.git', expected: { owner: 'facebook', repo: 'react', canonicalUrl: 'https://github.com/facebook/react' } },
    { input: 'https://github.com/zmsp/AppRankly/pkgs/container/apprankly', expected: { owner: 'zmsp', repo: 'AppRankly', isPackage: true, packageType: 'container', packageName: 'apprankly', canonicalUrl: 'https://github.com/zmsp/AppRankly/pkgs/container/apprankly' } },
    { input: 'https://github.com/users/zmsp/packages/container/package/apprankly', expected: { owner: 'zmsp', repo: 'apprankly', isPackage: true, packageType: 'container', packageName: 'apprankly', canonicalUrl: 'https://github.com/users/zmsp/packages/container/package/apprankly' } },
    { input: '', expected: null },
    { input: null, expected: null },
    { input: 'https://other-site.com/repo', expected: { owner: 'other-site.com', repo: 'repo', canonicalUrl: 'https://github.com/other-site.com/repo' } },
    { input: 'invalid', expected: null },
    { input: 'invalid/with space', expected: null }
  ];

  for (const { input, expected } of testCases) {
    const res = parseGitHubUrl(input);
    if (expected === null) {
      assert.strictEqual(res, null, `Expected null for "${input}", got ${JSON.stringify(res)}`);
    } else {
      assert.ok(res, `Expected result for "${input}", got null`);
      assert.strictEqual(res.owner, expected.owner);
      assert.strictEqual(res.repo, expected.repo);
      assert.strictEqual(res.canonicalUrl, expected.canonicalUrl);
    }
  }
  console.log('✓ parseGitHubUrl tests passed');
}

// 2. Mock API & Statistics Calculation Tests
console.log('Testing fetchGitHubStats with mocked client...');
(async () => {
  const mockRepoData = {
    name: 'sample-app',
    full_name: 'acme/sample-app',
    description: 'A great open-source project',
    stargazers_count: 5420,
    forks_count: 310,
    open_issues_count: 42,
    subscribers_count: 85,
    default_branch: 'main'
  };

  const mockReleasesData = [
    {
      id: 101,
      tag_name: 'v2.0.0',
      name: 'Release 2.0.0',
      published_at: '2026-10-25T12:00:00Z',
      assets: [
        { name: 'app-installer.exe', download_count: 1200, size: 5000000, content_type: 'application/octet-stream' },
        { name: 'app-darwin.dmg', download_count: 850, size: 6000000, content_type: 'application/octet-stream' },
        { name: 'app-linux.deb', download_count: 450, size: 4000000, content_type: 'application/octet-stream' }
      ]
    },
    {
      id: 100,
      tag_name: 'v1.9.0',
      name: 'Release 1.9.0',
      published_at: '2026-09-15T12:00:00Z',
      assets: [
        { name: 'app-installer.exe', download_count: 5000, size: 4800000, content_type: 'application/octet-stream' },
        { name: 'app-darwin.dmg', download_count: 3200, size: 5900000, content_type: 'application/octet-stream' }
      ]
    }
  ];

  const mockAxios = {
    get: async (url) => {
      if (url.includes('/releases')) {
        return { data: mockReleasesData };
      }
      return { data: mockRepoData };
    }
  };

  const stats = await fetchGitHubStats('https://github.com/acme/sample-app', {
    axiosInstance: mockAxios
  });

  assert.strictEqual(stats.owner, 'acme');
  assert.strictEqual(stats.repo, 'sample-app');
  assert.strictEqual(stats.stars, 5420);
  assert.strictEqual(stats.forks, 310);
  assert.strictEqual(stats.openIssues, 42);
  assert.strictEqual(stats.watchers, 85);
  // Total downloads = (1200 + 850 + 450) + (5000 + 3200) = 2500 + 8200 = 10700
  assert.strictEqual(stats.totalDownloads, 10700);
  assert.strictEqual(stats.releaseCount, 2);
  assert.strictEqual(stats.latestRelease.tag, 'v2.0.0');
  assert.strictEqual(stats.latestRelease.downloads, 2500);
  assert.strictEqual(stats.topAssets.length, 5);
  assert.strictEqual(stats.topAssets[0].name, 'app-installer.exe');
  assert.strictEqual(stats.topAssets[0].downloadCount, 5000);

  // Test direct package fetch
  const mockPackageAxios = {
    get: async (url) => {
      if (url.includes('/pkgs/container/')) {
        return { data: '<div><span class="d-block color-fg-muted text-small tmp-mb-1">Total downloads</span><h3 title="2061">2.06K</h3></div>' };
      }
      return { data: mockRepoData };
    }
  };

  const pkgStats = await fetchGitHubStats('https://github.com/zmsp/AppRankly/pkgs/container/apprankly', {
    axiosInstance: mockPackageAxios
  });

  assert.strictEqual(pkgStats.isPackage, true);
  assert.strictEqual(pkgStats.packageType, 'container');
  assert.strictEqual(pkgStats.packageName, 'apprankly');
  assert.strictEqual(pkgStats.packageDownloads, 2061);
  assert.strictEqual(pkgStats.totalDownloads, 2061);
  assert.strictEqual(pkgStats.stars, 5420);

  console.log('✓ fetchGitHubStats & download aggregation verified (including container packages)');

  // 3. Storage, Database, & History Delta Tests
  console.log('Testing saveDailySnapshot, SQLite persistence, and getRepoHistory...');
  const testDb = new DatabaseSync(':memory:');

  // Initialize schema
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS github_repos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE NOT NULL,
      owner TEXT NOT NULL,
      repo TEXT NOT NULL,
      name TEXT,
      description TEXT,
      default_branch TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS github_repo_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INTEGER REFERENCES github_repos(id),
      url TEXT NOT NULL,
      date TEXT NOT NULL,
      stars INTEGER NOT NULL DEFAULT 0,
      forks INTEGER NOT NULL DEFAULT 0,
      open_issues INTEGER NOT NULL DEFAULT 0,
      watchers INTEGER NOT NULL DEFAULT 0,
      total_downloads INTEGER NOT NULL DEFAULT 0,
      release_count INTEGER NOT NULL DEFAULT 0,
      latest_release_tag TEXT,
      latest_release_date TEXT,
      details_json TEXT,
      polled_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(url, date)
    );
  `);

  const tmpDataDir = path.join(__dirname, 'tmp_gh_test');
  if (!fs.existsSync(tmpDataDir)) fs.mkdirSync(tmpDataDir, { recursive: true });

  try {
    // Save Day 1
    const day1Stats = {
      ...stats,
      stars: 5400,
      totalDownloads: 10000
    };
    saveDailySnapshot(day1Stats, { db: testDb, dataDir: tmpDataDir, date: '2026-11-01' });

    // Save Day 2 (use current date so daily polling idempotency check triggers)
    const todayStr = new Date().toISOString().split('T')[0];
    const day2Stats = {
      ...stats,
      stars: 5420,
      totalDownloads: 10700
    };
    saveDailySnapshot(day2Stats, { db: testDb, dataDir: tmpDataDir, date: todayStr });

    // Query history
    const history = getRepoHistory('https://github.com/acme/sample-app', {
      db: testDb,
      dataDir: tmpDataDir
    });

    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0].date, '2026-11-01');
    assert.strictEqual(history[0].totalDownloads, 10000);
    assert.strictEqual(history[0].dailyDownloads, 0); // Day 1 baseline

    assert.strictEqual(history[1].date, todayStr);
    assert.strictEqual(history[1].totalDownloads, 10700);
    assert.strictEqual(history[1].dailyDownloads, 700); // 10700 - 10000
    assert.strictEqual(history[1].dailyStars, 20); // 5420 - 5400

    console.log('✓ SQLite snapshot storage and daily delta computation verified');

    // 4. Config Reading & Polling Logic Tests
    console.log('Testing getConfiguredRepos & pollAllConfiguredRepos...');
    const mockConfig = {
      githubRepos: [
        'https://github.com/acme/sample-app',
        'https://github.com/acme/sample-app/', // duplicate URL
        { url: 'https://github.com/expressjs/express' },
        'invalid-url'
      ]
    };

    const configured = getConfiguredRepos(mockConfig);
    assert.strictEqual(configured.length, 2);
    assert.strictEqual(configured[0], 'https://github.com/acme/sample-app');
    assert.strictEqual(configured[1], 'https://github.com/expressjs/express');

    // Test polling with today's date already saved for sample-app
    let pollMockAxiosCalled = 0;
    const trackingMockAxios = {
      get: async (url) => {
        pollMockAxiosCalled++;
        if (url.includes('/releases')) return { data: [] };
        return { data: { name: 'express', stargazers_count: 65000, forks_count: 10000 } };
      }
    };

    // Override fetchGitHubStats axios inside poll test
    const origFetch = require('../lib/githubTracker').fetchGitHubStats;

    // Test pollAllConfiguredRepos without force: sample-app on 2026-11-02 was already polled
    const pollResult = await pollAllConfiguredRepos({
      getBaseConfig: () => mockConfig,
      DATA_DIR: tmpDataDir,
      db: testDb,
      force: false,
      axiosInstance: trackingMockAxios
    });

    assert.strictEqual(pollResult.totalConfigured, 2);
    // acme/sample-app should be skipped because 2026-11-02 was saved earlier
    const skippedItem = pollResult.results.find(r => r.url === 'https://github.com/acme/sample-app');
    assert.ok(skippedItem);
    assert.strictEqual(skippedItem.status, 'skipped');

    console.log('✓ Daily polling idempotency & skipping verified');

    // Test getTrackedReposSummary
    const summary = getTrackedReposSummary({
      getBaseConfig: () => mockConfig,
      DATA_DIR: tmpDataDir,
      db: testDb
    });

    assert.strictEqual(summary.length, 2);
    const sampleAppSummary = summary.find(s => s.repo === 'sample-app');
    assert.ok(sampleAppSummary);
    assert.strictEqual(sampleAppSummary.stars, 5420);
    assert.strictEqual(sampleAppSummary.totalDownloads, 10700);
    assert.strictEqual(sampleAppSummary.dailyDownloads, 700);

    console.log('✓ getTrackedReposSummary verified');

    // 5. Growth Notification Tests
    console.log('Testing checkAndSendGrowthNotification...');
    const { checkAndSendGrowthNotification } = require('../lib/githubTracker');

    // Case A: Stars increased
    const notifiedStars = await checkAndSendGrowthNotification(
      { name: 'AppRankly', fullName: 'zmsp/AppRankly', stars: 35, totalDownloads: 2000 },
      { stars: 28, total_downloads: 2000, date: '2026-11-01' },
      { ntfyTopic: '' },
      tmpDataDir
    );
    assert.strictEqual(notifiedStars, true, 'Expected notification when stars increase');

    // Case B: Downloads increased
    const notifiedDownloads = await checkAndSendGrowthNotification(
      { name: 'AppRankly', fullName: 'zmsp/AppRankly', stars: 28, totalDownloads: 2150 },
      { stars: 28, total_downloads: 2000, date: '2026-11-01' },
      { ntfyTopic: '' },
      tmpDataDir
    );
    assert.strictEqual(notifiedDownloads, true, 'Expected notification when downloads increase');

    // Case C: No increase
    const noNotification = await checkAndSendGrowthNotification(
      { name: 'AppRankly', fullName: 'zmsp/AppRankly', stars: 28, totalDownloads: 2000 },
      { stars: 28, total_downloads: 2000, date: '2026-11-01' },
      { ntfyTopic: '' },
      tmpDataDir
    );
    assert.strictEqual(noNotification, false, 'Expected no notification when count did not increase');

    console.log('✓ checkAndSendGrowthNotification delta logic verified');

  } finally {
    // Cleanup temp files
    if (fs.existsSync(tmpDataDir)) {
      fs.rmSync(tmpDataDir, { recursive: true, force: true });
    }
  }

  console.log('\n✓ All GitHub Repository Tracking tests passed successfully!');
})().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

