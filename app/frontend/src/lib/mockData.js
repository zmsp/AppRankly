import { ISO_COUNTRY_MAP } from './constants';

export { ISO_COUNTRY_MAP };

export const MOCK_PROJECTS = [
  {
    index: "demo1",
    name: "App Alpha",
    packageName: "com.demo.alpha",
    platform: "google",
    iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgMTI4IDEyOCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnMSIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzNiODJmNiIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzA2YjZkNCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iMjgiIGZpbGw9InVybCgjZzEpIi8+PHRleHQgeD0iNjQiIHk9IjgyIiBmb250LWZhbWlseT0ic3lzdGVtLXVpLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjY0IiBmb250LXdlaWdodD0iOTAwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QTwvdGV4dD48L3N2Zz4=",
    developer: "Demo Studios",
    description: "A fantastic alpha app for demonstration."
  },
  {
    index: "demo2",
    name: "App Beta",
    packageName: "com.demo.beta",
    platform: "google",
    iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgMTI4IDEyOCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnMiIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzYzNjZmMSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzhiNWNmNiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iMjgiIGZpbGw9InVybCgjZzIpIi8+PHRleHQgeD0iNjQiIHk9IjgyIiBmb250LWZhbWlseT0ic3lzdGVtLXVpLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjY0IiBmb250LXdlaWdodD0iOTAwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QjwvdGV4dD48L3N2Zz4=",
    developer: "Demo Studios",
    description: "The beta application with next-gen features."
  },
  {
    index: "demo3",
    name: "App Gamma",
    packageName: "com.demo.gamma",
    platform: "apple",
    iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgMTI4IDEyOCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnMyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2VjNDg5OSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2Y0M2Y1ZSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iMjgiIGZpbGw9InVybCgjZzMpIi8+PHRleHQgeD0iNjQiIHk9IjgyIiBmb250LWZhbWlseT0ic3lzdGVtLXVpLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjY0IiBmb250LXdlaWdodD0iOTAwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RzwvdGV4dD48L3N2Zz4=",
    developer: "Demo Studios",
    description: "Gamma app for iOS users."
  }
];

export const MOCK_DATA = {
  overview: {
    currentlyActiveDevices: 128450,
    totalInstallCountByUser: 485910,
    totalUninstallCountByUser: 210340,
    totalDailyDeviceInstalls: 520000,
    totalDailyUserInstalls: 485910,
    totalDailyUserUninstalls: 210340,
    totalInstallEventsDetected: 654120,
    totalUninstallEventsDetected: 284760,
  },
  dimensions: {
    country: [
      { label: 'United States', activeDevices: 45200, totalInstalls: 155000 },
      { label: 'India', activeDevices: 32400, totalInstalls: 124000 },
      { label: 'United Kingdom', activeDevices: 12800, totalInstalls: 48000 },
      { label: 'Germany', activeDevices: 9500, totalInstalls: 35000 },
      { label: 'Canada', activeDevices: 8200, totalInstalls: 31000 },
      { label: 'Brazil', activeDevices: 7100, totalInstalls: 29000 },
      { label: 'Australia', activeDevices: 5800, totalInstalls: 22000 },
      { label: 'France', activeDevices: 4300, totalInstalls: 18000 },
      { label: 'Mexico', activeDevices: 3100, totalInstalls: 13000 }
    ],
    os_version: [
      { label: 'Android 14 (OS 34)', activeDevices: 58400, totalInstalls: 185000 },
      { label: 'Android 13 (OS 33)', activeDevices: 38200, totalInstalls: 150000 },
      { label: 'Android 12 (OS 32)', activeDevices: 18100, totalInstalls: 85000 },
      { label: 'Android 11 (OS 30)', activeDevices: 9300, totalInstalls: 42000 },
      { label: 'Android 10 (OS 29)', activeDevices: 4400, totalInstalls: 23000 }
    ],
    app_version: [
      { label: 'v2.4.0 (Latest)', activeDevices: 84300, totalInstalls: 92000 },
      { label: 'v2.3.1', activeDevices: 28400, totalInstalls: 145000 },
      { label: 'v2.3.0', activeDevices: 11200, totalInstalls: 130000 },
      { label: 'v2.2.0', activeDevices: 4500, totalInstalls: 98000 }
    ],
    device: [
      { label: 'Samsung Galaxy S23', activeDevices: 14200, totalInstalls: 45000 },
      { label: 'Google Pixel 8', activeDevices: 11500, totalInstalls: 32000 },
      { label: 'OnePlus 11', activeDevices: 9100, totalInstalls: 28000 },
      { label: 'Samsung Galaxy A54', activeDevices: 8400, totalInstalls: 31000 },
      { label: 'Xiaomi 13', activeDevices: 7600, totalInstalls: 26000 },
      { label: 'Google Pixel 7a', activeDevices: 6200, totalInstalls: 19000 }
    ]
  }
};

export const generateDemoTrends = (startDateStr, endDateStr) => {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

  const demoApps = ["App Alpha", "App Beta", "App Gamma"];

  const appTrends = {
    "App Alpha": [],
    "App Beta": [],
    "App Gamma": []
  };

  const dailyTrends = Array.from({ length: diffDays + 1 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    if (d > end) return null;

    const formattedDate = d.toISOString().split('T')[0];

    const alphaInstalls = 900 + Math.floor(Math.sin(i / 2) * 250) + Math.floor(Math.random() * 150);
    const betaInstalls = 450 + Math.floor(Math.cos(i / 2.5) * 150) + Math.floor(Math.random() * 100);
    const gammaInstalls = 150 + Math.floor(Math.sin(i / 3) * 60) + Math.floor(Math.random() * 50);

    const alphaUninstalls = 300 + Math.floor(Math.cos(i / 3) * 100) + Math.floor(Math.random() * 80);
    const betaUninstalls = 250 + Math.floor(Math.cos(i / 3.5) * 80) + Math.floor(Math.random() * 60);
    const gammaUninstalls = 150 + Math.floor(Math.cos(i / 4) * 50) + Math.floor(Math.random() * 40);

    const baseActiveAlpha = 60000 + (i * 150) + Math.floor(Math.random() * 400);
    const baseActiveBeta = 40000 + (i * 100) + Math.floor(Math.random() * 300);
    const baseActiveGamma = 20000 + (i * 50) + Math.floor(Math.random() * 100);

    const upgradesAlpha = 1000 + Math.floor(Math.random() * 500);
    const upgradesBeta = 700 + Math.floor(Math.random() * 300);
    const upgradesGamma = 300 + Math.floor(Math.random() * 200);

    appTrends["App Alpha"].push({
      date: formattedDate,
      dailyUserInstalls: alphaInstalls,
      dailyInstalls: alphaInstalls,
      dailyUninstalls: alphaUninstalls,
      dailyUserUninstalls: alphaUninstalls,
      activeDevices: baseActiveAlpha,
      upgrades: upgradesAlpha,
      netGrowth: alphaInstalls - alphaUninstalls,
      dailyDeviceInstalls: Math.floor(alphaInstalls * 1.1)
    });
    appTrends["App Beta"].push({
      date: formattedDate,
      dailyUserInstalls: betaInstalls,
      dailyInstalls: betaInstalls,
      dailyUninstalls: betaUninstalls,
      dailyUserUninstalls: betaUninstalls,
      activeDevices: baseActiveBeta,
      upgrades: upgradesBeta,
      netGrowth: betaInstalls - betaUninstalls,
      dailyDeviceInstalls: Math.floor(betaInstalls * 1.1)
    });
    appTrends["App Gamma"].push({
      date: formattedDate,
      dailyUserInstalls: gammaInstalls,
      dailyInstalls: gammaInstalls,
      dailyUninstalls: gammaUninstalls,
      dailyUserUninstalls: gammaUninstalls,
      activeDevices: baseActiveGamma,
      upgrades: upgradesGamma,
      netGrowth: gammaInstalls - gammaUninstalls,
      dailyDeviceInstalls: Math.floor(gammaInstalls * 1.1)
    });

    const userInstalls = alphaInstalls + betaInstalls + gammaInstalls;
    const baseActive = baseActiveAlpha + baseActiveBeta + baseActiveGamma;
    const deviceInstalls = Math.floor(alphaInstalls * 1.1) + Math.floor(betaInstalls * 1.1) + Math.floor(gammaInstalls * 1.1);
    const uninstalls = alphaUninstalls + betaUninstalls + gammaUninstalls;
    const upgrades = upgradesAlpha + upgradesBeta + upgradesGamma;

    return {
      date: formattedDate,
      activeDevices: baseActive,
      dailyInstalls: userInstalls,
      dailyUninstalls: uninstalls,
      dailyUserInstalls: userInstalls,
      dailyUserUninstalls: uninstalls,
      dailyDeviceInstalls: deviceInstalls,
      upgrades: upgrades,
      netGrowth: userInstalls - uninstalls
    };
  }).filter(Boolean);

  // Key appTrends by packageName as well as platform-prefixed key for exact lookup
  appTrends["com.demo.alpha"] = appTrends["App Alpha"];
  appTrends["com.demo.beta"] = appTrends["App Beta"];
  appTrends["com.demo.gamma"] = appTrends["App Gamma"];

  appTrends["google:com.demo.alpha"] = appTrends["App Alpha"];
  appTrends["google:com.demo.beta"] = appTrends["App Beta"];
  appTrends["apple:com.demo.gamma"] = appTrends["App Gamma"];

  // Compute platformTotals for Google and Apple
  const googleTotal = appTrends["App Alpha"].reduce((sum, d) => sum + d.dailyUserInstalls, 0) +
                      appTrends["App Beta"].reduce((sum, d) => sum + d.dailyUserInstalls, 0);
  const appleTotal = appTrends["App Gamma"].reduce((sum, d) => sum + d.dailyUserInstalls, 0);

  const platformTotals = {
    google: {
      totalDailyUserInstalls: googleTotal,
      totalInstalls: googleTotal,
      appCount: 2
    },
    apple: {
      totalDailyUserInstalls: appleTotal,
      totalInstalls: appleTotal,
      appCount: 1
    }
  };

  return { dailyTrends, appTrends, platformTotals };
};

export const MOCK_RELEASES = [
  {
    id: "demo_rel_1",
    version: "2.4.0",
    platform: "google",
    packageName: "com.demo.alpha",
    date: "2026-10-28T14:30:00Z",
    notes: "Release 2.4.0: Added smart task reminders, subtasks nesting, and performance optimizations.",
    source: "manual",
    churnRate: 0.038,
    churnImpact: "positive",
    deltaRate: -0.012
  },
  {
    id: "demo_rel_2",
    version: "2.3.1",
    platform: "google",
    packageName: "com.demo.alpha",
    date: "2026-09-18T10:15:00Z",
    notes: "Hotfix release addressing recurring alarm sync edge cases.",
    source: "auto",
    churnRate: 0.052,
    churnImpact: "neutral",
    deltaRate: 0.002
  },
  {
    id: "demo_rel_3",
    version: "3.1.0",
    platform: "google",
    packageName: "com.demo.beta",
    date: "2026-10-20T16:00:00Z",
    notes: "Major update: Barcode scanner redesign, micro-nutrient tracking, Apple Health sync.",
    source: "manual",
    churnRate: 0.029,
    churnImpact: "positive",
    deltaRate: -0.015
  },
  {
    id: "demo_rel_4",
    version: "1.5.0",
    platform: "apple",
    packageName: "com.demo.gamma",
    date: "2026-10-25T09:00:00Z",
    notes: "iOS 18 Widget interactive controls, recurring budget categories, CSV statements export.",
    source: "manual",
    churnRate: 0.032,
    churnImpact: "positive",
    deltaRate: -0.008
  },
  {
    id: "demo_rel_5",
    version: "1.4.2",
    platform: "apple",
    packageName: "com.demo.gamma",
    date: "2026-09-12T11:20:00Z",
    notes: "Biometric FaceID unlock reliability update.",
    source: "auto",
    churnRate: 0.041,
    churnImpact: "neutral",
    deltaRate: -0.001
  }
];

export const MOCK_GITHUB_REPOS = [
  {
    url: "https://github.com/zmsp/AppRankly",
    owner: "zmsp",
    repo: "AppRankly",
    isPackage: false,
    packageType: null,
    packageName: null,
    description: "Self-hosted, open-source mobile app analytics & ASO dashboard for Google Play Store and Apple App Store.",
    isPolledToday: true,
    latestDate: new Date().toISOString().split('T')[0],
    stars: 36,
    dailyStars: 5,
    totalDownloads: 2149,
    dailyDownloads: 47,
    releaseDownloads: 28,
    packageDownloads: 2121,
    packages: [
      {
        name: "apprankly",
        type: "container",
        url: "https://github.com/users/zmsp/packages/container/package/apprankly",
        downloads: 2121
      }
    ],
    forks: 7,
    openIssues: 0,
    openIssuesOnly: 0,
    openPullRequests: 3,
    totalCommits: 134,
    latestCommit: {
      message: "chore: bump version to 2.2.0",
      date: "2026-11-02T17:12:51Z",
      author: "Zobair S",
      sha: "6c3e361"
    },
    primaryLanguage: "JavaScript",
    languages: {
      JavaScript: 1565258,
      HTML: 5432,
      Dockerfile: 1757,
      CSS: 1705,
      Shell: 853
    },
    languagePercentages: [
      { language: "JavaScript", bytes: 1565258, percentage: 99.4 },
      { language: "HTML", bytes: 5432, percentage: 0.3 },
      { language: "Dockerfile", bytes: 1757, percentage: 0.1 },
      { language: "CSS", bytes: 1705, percentage: 0.1 },
      { language: "Shell", bytes: 853, percentage: 0.1 }
    ],
    sizeKb: 20172,
    license: "NOASSERTION",
    topics: [
      "android",
      "app-store-connect",
      "apple-app-store",
      "aso",
      "dashboards",
      "docker",
      "google-play",
      "google-play-console",
      "ios",
      "mobile-analytics",
      "nodejs",
      "play-store",
      "privacy",
      "react",
      "retention-analytics",
      "self-hosted",
      "store-analytics",
      "unraid"
    ],
    createdAt: "2026-07-23T15:44:45Z",
    pushedAt: "2026-11-02T17:13:26Z",
    isArchived: false,
    watchers: 36,
    latestReleaseTag: "v2.2.0",
    latestRelease: {
      tag: "v2.2.0",
      name: "v2.2.0 — GitHub Repository Tracking & AskRankly AI Intelligence",
      publishedAt: "2026-11-02T17:13:36Z",
      downloads: 16,
      assets: [
        { name: "github-repo-trends-modal.png", downloadCount: 4, size: 110155 },
        { name: "github-repos-overview.png", downloadCount: 12, size: 161074 }
      ]
    },
    topAssets: [
      {
        releaseTag: "v2.2.0",
        name: "github-repos-overview.png",
        size: 161074,
        contentType: "image/png",
        downloadCount: 12,
        updatedAt: "2026-11-02T17:13:36Z"
      },
      {
        releaseTag: "v2.2.0",
        name: "github-repo-trends-modal.png",
        size: 110155,
        contentType: "image/png",
        downloadCount: 4,
        updatedAt: "2026-11-02T17:13:36Z"
      }
    ],
    history: [
      {
        date: "2026-10-25",
        stars: 22,
        dailyStars: 2,
        forks: 5,
        openIssues: 0,
        watchers: 22,
        totalDownloads: 1820,
        dailyDownloads: 45,
        releaseCount: 6,
        latestReleaseTag: "v2.0.0"
      },
      {
        date: "2026-10-28",
        stars: 25,
        dailyStars: 3,
        forks: 6,
        openIssues: 0,
        watchers: 25,
        totalDownloads: 1940,
        dailyDownloads: 60,
        releaseCount: 7,
        latestReleaseTag: "v2.1.0"
      },
      {
        date: "2026-11-02",
        stars: 31,
        dailyStars: 6,
        forks: 7,
        openIssues: 0,
        watchers: 31,
        totalDownloads: 2102,
        dailyDownloads: 162,
        releaseCount: 7,
        latestReleaseTag: "v2.1.0"
      },
      {
        date: "2026-11-04",
        stars: 36,
        dailyStars: 5,
        forks: 7,
        openIssues: 0,
        watchers: 36,
        totalDownloads: 2149,
        dailyDownloads: 47,
        releaseCount: 8,
        latestReleaseTag: "v2.2.0"
      }
    ]
  }
];


