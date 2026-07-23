import { ISO_COUNTRY_MAP } from './constants';

export { ISO_COUNTRY_MAP };

export const MOCK_PROJECTS = [
  {
    index: "demo1",
    name: "App Alpha",
    packageName: "com.demo.alpha",
    platform: "google",
    iconUrl: "https://play-lh.googleusercontent.com/uGzX6E8-t0_w4U3Tq-G9_sC4n6K8N74L11_O2Q5vN_h6X9_z3q_4b_J3v5-b-n",
    developer: "Demo Studios",
    description: "A fantastic alpha app for demonstration."
  },
  {
    index: "demo2",
    name: "App Beta",
    packageName: "com.demo.beta",
    platform: "google",
    iconUrl: "https://play-lh.googleusercontent.com/9nU2wU_K_aO99Kq_A8u9x9O_t-P_sC4n6K8N74L11_O2Q5vN_h6X9_z3q_4b_J3v5-b-n",
    developer: "Demo Studios",
    description: "The beta application with next-gen features."
  },
  {
    index: "demo3",
    name: "App Gamma",
    packageName: "com.demo.gamma",
    platform: "apple",
    iconUrl: "https://is1-ssl.mzstatic.com/image/thumb/Purple126/v4/a1/90/19/a1901901-443b-410a-3a7b-3b3b3b3b3b3b/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/512x512bb.jpg",
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

  return { dailyTrends, appTrends };
};
