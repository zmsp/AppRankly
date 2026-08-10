#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { ensureDirectoriesAndTemplates } = require("./lib/init");

ensureDirectoriesAndTemplates();

const argv = require("yargs")
  .usage("Usage: $0 [options]")
  .option("g", {
    alias: "projectID",
    type: "string",
    describe: "Google Cloud Project ID"
  })
  .option("p", {
    alias: "packageName",
    type: "string",
    describe: "Target app package name"
  })
  .option("b", {
    alias: "bucketName",
    type: "string",
    describe: "Bucket name (e.g. pubsite_prod_xxxx)"
  })
  .option("k", {
    alias: "key",
    type: "string",
    describe: "Service account JSON file path"
  })
  .option("c", {
    alias: "config",
    type: "string",
    default: process.env.CONFIG_PATH || "./config.json",
    describe: "Path to config.json file"
  })
  .option("s", {
    alias: "project",
    type: "string",
    describe: "Name or index of the saved project from config"
  })
  .option("app", {
    type: "string",
    describe: "Target app package name for cache clear or backfill"
  })
  .option("since", {
    type: "string",
    describe: "Since date for backfill (YYYY-MM)"
  })
  .option("start", {
    type: "string",
    describe: "Start date for stats (YYYY-MM-DD)"
  })
  .option("end", {
    type: "string",
    describe: "End date for stats (YYYY-MM-DD)"
  })
  .option("f", {
    alias: "force",
    type: "boolean",
    describe: "Force re-downloading reports from GCS bypassing local cache"
  })
  .help("h").argv;

const command = argv._[0];

if (command === "backfill") {
  const ingest = require("./lib/db/ingest");
  ingest.backfill(argv.app, argv.since).then(() => {
    console.log("Backfill complete");
  }).catch(err => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
  return;
} else if (command === "status") {
  const ingest = require("./lib/db/ingest");
  ingest.status().then(() => {}).catch(err => {
    console.error("Status failed:", err);
    process.exit(1);
  });
  return;
} else if (command === "cache-clear") {
  const ingest = require("./lib/db/ingest");
  ingest.clearCache(argv.app).then(() => {
    console.log("Cache cleared");
  }).catch(err => {
    console.error("Cache clear failed:", err);
    process.exit(1);
  });
  return;
}

const GooglePlayStoreStatsViewer = require("./lib/GooglePlayStoreStatsViewer");

let options = {};

if (argv.project) {
  let configPath = path.resolve(argv.config);
  if (!fs.existsSync(configPath) && !argv.config.includes("/") && !argv.config.includes("\\")) {
    // Try fallback to ../config/config.json if just "./config.json" was used and failed
    const fallbackPath = path.join(__dirname, "..", "config", "config.json");
    if (fs.existsSync(fallbackPath)) {
      configPath = fallbackPath;
    }
  }

  if (!fs.existsSync(configPath)) {
    console.error(`Error: Config file not found at ${configPath}`);
    process.exit(1);
  }

  let projects;
  try {
    projects = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (err) {
    console.error(`Error reading config file: ${err.message}`);
    process.exit(1);
  }

  let proj = null;
  const index = parseInt(argv.project, 10);
  if (!isNaN(index) && projects[index]) {
    proj = projects[index];
  } else {
    proj = projects.find(p => p.name && p.name.toLowerCase() === argv.project.toLowerCase());
  }

  if (!proj) {
    console.error(`Error: Saved project "${argv.project}" not found in config.`);
    console.log("\nAvailable projects in config:");
    projects.forEach((p, idx) => {
      console.log(`  [${idx}] ${p.name || "Unnamed Project"} (${p.packageName})`);
    });
    process.exit(1);
  }

  let resolvedKeyPath = null;
  if (proj.keyFilePath) {
    resolvedKeyPath = path.isAbsolute(proj.keyFilePath)
      ? proj.keyFilePath
      : path.resolve(path.dirname(configPath), proj.keyFilePath);
  }

  options = {
    projectID: proj.projectID,
    packageName: proj.packageName || argv.packageName,
    bucketName: proj.bucketName,
    keyJson: proj.keyJson,
    keyFilePath: resolvedKeyPath
  };
} else {
  if (!argv.key) {
    console.error("Error: --key (-k) option is required when --project is not specified.");
    process.exit(1);
  }

  options = {
    projectID: argv.projectID,
    packageName: argv.packageName,
    bucketName: argv.bucketName,
    keyFilePath: argv.key
  };
}

const statsViewer = new GooglePlayStoreStatsViewer(options);

statsViewer
  .getAppStats(argv.start, argv.end, argv.force)
  .then(obj => {
    console.log(JSON.stringify(obj, null, 2));
  })
  .catch(err => {
    console.error("Error fetching Play Store stats:", err.message || err);
    process.exit(1);
  });

