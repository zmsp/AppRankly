const { getBaseConfig, resolveKeyFilePath, DATA_DIR } = require("./config");
const AppleAppStoreStatsViewer = require("./AppleAppStoreStatsViewer");
const GooglePlayStoreStatsViewer = require("./GooglePlayStoreStatsViewer");
const resolver = require("./resolver");
const { getNormalizedPairings } = require("./metrics");

const buildAppleViewer = (baseConfig, appId) => {
  const appleKeyPath = resolveKeyFilePath(baseConfig.keyFilePath_apple);
  if (!appleKeyPath) throw new Error('Apple key file not found or access denied.');
  const privateKey = require('fs').readFileSync(appleKeyPath, 'utf8');
  return new AppleAppStoreStatsViewer({
    issuerId: baseConfig.appleIssuerId,
    keyId: baseConfig.appleKeyId,
    vendorId: baseConfig.appleVendorId,
    privateKey,
    appId,
    dataDir: DATA_DIR
  });
};

const buildGoogleViewer = (baseConfig, packageName) => {
  return new GooglePlayStoreStatsViewer({
    keyFilePath: resolveKeyFilePath(baseConfig.keyFilePath),
    keyJson: baseConfig.keyJson,
    projectID: baseConfig.projectID,
    bucketName: baseConfig.bucketName,
    packageName,
    dataDir: DATA_DIR
  });
};

const getIgnoredSet = (baseConfig) => {
  const list = [...(baseConfig?.ignoredPackages || [])];
  const normalizedPairs = getNormalizedPairings(baseConfig);
  normalizedPairs.forEach(pair => {
    if (pair.ignore) {
      if (pair.googlePackageName) list.push(pair.googlePackageName);
      if (pair.appleBundleId) list.push(pair.appleBundleId);
    }
  });
  return new Set(list.map(p => String(p).trim().toLowerCase()).filter(Boolean));
};

const fetchPackagesByPlatform = async (platform, baseConfig) => {
  return resolver.resolve('packages:all', { platform }, async () => {
    const fetchApple = async () => {
      try {
        const viewer = buildAppleViewer(baseConfig);
        const pkgs = await viewer.listPackages();
        return pkgs.map(p => ({ ...p, platform: 'apple' }));
      } catch (e) {
        console.error('Error fetching Apple packages:', e.message);
        return [];
      }
    };

    const fetchGoogle = async () => {
      try {
        const viewer = buildGoogleViewer(baseConfig, 'dummy');
        let pkgs = await viewer.listPackages();
        const ignoredSet = getIgnoredSet(baseConfig);
        pkgs = pkgs.filter(p => !ignoredSet.has(String(p.packageName).trim().toLowerCase()));
        return pkgs.map(p => ({ ...p, platform: 'google' }));
      } catch (e) {
        console.error('Error fetching Google packages:', e.message);
        return [];
      }
    };

    if (platform === 'apple') return fetchApple();
    if (platform === 'google') return fetchGoogle();
    const [applePkgs, googlePkgs] = await Promise.all([fetchApple(), fetchGoogle()]);
    return [...applePkgs, ...googlePkgs];
  });
};

module.exports = {
  buildAppleViewer,
  buildGoogleViewer,
  fetchPackagesByPlatform,
  getIgnoredSet
};
