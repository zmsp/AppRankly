const { getBaseConfig } = require('./app/lib/init');
const { buildGoogleViewer, buildAppleViewer, fetchPackagesByPlatform } = require('./app/lib/resolver');
const { checkAndNotifyStats } = require('./app/lib/scheduler');
const path = require('path');

const mockHelpers = {
  getBaseConfig: () => {
    const fs = require('fs');
    return JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  },
  DATA_DIR: path.join(__dirname, 'data'),
  buildGoogleViewer: (config, pkg) => {
    const GooglePlayStoreStatsViewer = require('./app/lib/GooglePlayStoreStatsViewer');
    return new GooglePlayStoreStatsViewer(pkg, config.bucketName, path.join(__dirname, 'cache'));
  },
  buildAppleViewer: (config, pkg) => {
    const AppleAppStoreStatsViewer = require('./app/lib/AppleAppStoreStatsViewer');
    return new AppleAppStoreStatsViewer(pkg, config.appleVendorId, path.join(__dirname, 'cache'));
  },
  fetchPackagesByPlatform: async () => [
    { platform: 'google', packageName: 'com.example.app', name: 'Example App' }
  ]
};

async function test() {
  const result = await checkAndNotifyStats(mockHelpers, { force: true });
  console.log("Result:", result);
}
test();
