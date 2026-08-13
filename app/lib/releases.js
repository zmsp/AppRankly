const fs = require("fs");
const path = require("path");
const { DATA_DIR } = require("./config");
const resolver = require("./resolver");

const RELEASES_FILE = path.join(DATA_DIR, "releases.json");

function getReleasesFromFile() {
  if (fs.existsSync(RELEASES_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(RELEASES_FILE, 'utf8'));
    } catch (e) {
      console.error("Error reading releases file:", e);
    }
  }
  return [];
}

function saveReleasesToFile(releases) {
  fs.writeFileSync(RELEASES_FILE, JSON.stringify(releases, null, 2));
  resolver.clearCache('stats');
}

module.exports = {
  RELEASES_FILE,
  getReleasesFromFile,
  saveReleasesToFile
};
