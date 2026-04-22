#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REPOS_DIR = path.join(ROOT, "repos");
const FEATURES_DIR = path.join(ROOT, "features");
const SETTINGS_PATH = path.join(ROOT, "settings.json");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

function loadSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    console.warn(`Warning: Settings file not found: ${SETTINGS_PATH}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
  } catch (err) {
    console.warn(`Warning: Failed to parse settings.json: ${err.message}`);
    return null;
  }
}

function buildPullArgs(pullConfig) {
  const args = ["git", "pull"];
  if (pullConfig.strategy === "rebase") {
    args.push("--rebase");
  }
  if (pullConfig.autoStash) {
    args.push("--autostash");
  }
  return args.join(" ");
}

function cloneRepo(repo) {
  const dest = path.join(REPOS_DIR, repo.name);
  if (fs.existsSync(path.join(dest, ".git"))) {
    return false;
  }

  console.log(`Cloning ${repo.name} from ${repo.url}...`);
  try {
    execSync(`git clone ${repo.url} ${dest}`, {
      stdio: "pipe",
      timeout: 30000,
    });
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : "";
    if (stderr.includes("Permission denied") || stderr.includes("Repository not found")) {
      console.warn(`Skipping ${repo.name}: no access or repository not found.`);
    } else {
      console.error(`Failed to clone ${repo.name}: ${stderr || err.message}`);
    }
    return false;
  }
  return true;
}

function pullRepo(repo, pullConfig) {
  const dest = path.join(REPOS_DIR, repo.name);

  if (!fs.existsSync(path.join(dest, ".git"))) {
    return;
  }

  console.log(`Pulling latest changes for ${repo.name}...`);
  const cmd = buildPullArgs(pullConfig);
  try {
    execSync(cmd, { cwd: dest, stdio: "inherit" });
  } catch (err) {
    console.error(`Failed to pull ${repo.name}: ${err.message}`);
  }
}

function main() {
  ensureDir(REPOS_DIR);
  ensureDir(FEATURES_DIR);
  ensureDir(path.join(FEATURES_DIR, "active"));
  ensureDir(path.join(FEATURES_DIR, "completed"));
  ensureDir(path.join(FEATURES_DIR, "archived"));

  const settings = loadSettings();
  if (!settings) {
    console.log("Session setup complete (no settings loaded).");
    return;
  }

  const repositories = settings.repositories || [];
  const pullConfig = settings.pull || {};

  for (const repo of repositories) {
    if (!repo.url) {
      continue;
    }
    if (repo.url.startsWith("https://github.com/")) {
      repo.url = repo.url
        .replace("https://github.com/", "git@github.com:")
        .replace(/\/?$/, ".git")
        .replace(".git.git", ".git");
    }
    const cloned = cloneRepo(repo);
    if (!cloned) {
      pullRepo(repo, pullConfig);
    }
  }
}

main();
