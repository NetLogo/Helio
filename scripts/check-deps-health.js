#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const semver = require("semver");

class Rule {
  constructor(name, level = "error" /* or "warn" */) {
    this.name = name;
    this.level = level;
  }

  check() {
    throw new Error("Not implemented");
  }

  pass(msg) {
    console.log(`OK [${this.name}]: ${msg}`);
  }

  fail(issues) {
    const log = this.level === "warn" ? console.warn : console.error;
    const prefix = this.level === "warn" ? "WARN" : "FAIL";
    log(`${prefix} [${this.name}]:`);
    issues.forEach((i) => log(`  ${i}`));
  }

  setLevel(level) {
    this.level = level;
    return this;
  }
}

// Helpers

const _yarnWhyCache = new Map();

function yarnWhy(pkg) {
  if (_yarnWhyCache.has(pkg)) return _yarnWhyCache.get(pkg);
  try {
    const out = execSync(`yarn why ${pkg} --json`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const versions = new Set();
    for (const line of out.trim().split("\n").filter(Boolean)) {
      const entry = JSON.parse(line);
      if (entry.type !== "info" || typeof entry.data !== "string") continue;
      const match = entry.data.match(/Found ".+@(\d+\..+?)"/);
      if (match) versions.add(match[1]);
    }
    _yarnWhyCache.set(pkg, versions);
    return versions;
  } catch {
    const empty = new Set();
    _yarnWhyCache.set(pkg, empty);
    return empty;
  }
}

function findPackageJsons(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findPackageJsons(full, results);
    } else if (entry.name === "package.json") {
      results.push(full);
    }
  }
  return results;
}

function readPackageJsons(root) {
  return findPackageJsons(root).map((file) => ({
    file,
    json: JSON.parse(fs.readFileSync(file, "utf-8")),
  }));
}

// Cached so multiple rules don't re-scan
let _pkgJsons;
function getPackageJsons() {
  if (!_pkgJsons) _pkgJsons = readPackageJsons(process.cwd());
  return _pkgJsons;
}

let _installWarnings;
function getInstallWarnings() {
  if (_installWarnings) return _installWarnings;
  try {
    const out = execSync("yarn install --check-files 2>&1", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    _installWarnings = out.split("\n");
  } catch (e) {
    _installWarnings = (e.stdout || "").split("\n").concat((e.stderr || "").split("\n"));
  }
  return _installWarnings;
}

class ExactVersionMatchRule extends Rule {
  constructor(name, packages) {
    super(name);
    this.packages = packages;
  }

  check() {
    const issues = [];
    const allVersions = new Set();

    for (const pkg of this.packages) {
      const versions = yarnWhy(pkg);
      for (const v of versions) allVersions.add(v);

      if (versions.size === 0) {
        issues.push(`${pkg}: not found`);
      } else if (versions.size > 1) {
        issues.push(`${pkg}: dupes → ${[...versions].join(", ")}`);
      }
    }

    if (allVersions.size > 1) {
      const byVersion = {};
      for (const pkg of this.packages) {
        for (const v of yarnWhy(pkg)) {
          (byVersion[v] ??= []).push(pkg);
        }
      }
      for (const [ver, pkgs] of Object.entries(byVersion)) {
        issues.push(`${ver}: ${pkgs.join(", ")}`);
      }
    }

    if (issues.length > 0) {
      this.fail(issues);
      return false;
    }
    this.pass(`All on ${[...allVersions][0]}`);
    return true;
  }
}

class SingleVersionRule extends Rule {
  constructor(name, packages) {
    super(name);
    this.packages = packages;
  }

  check() {
    const issues = [];

    for (const pkg of this.packages) {
      const versions = yarnWhy(pkg);
      if (versions.size > 1) {
        issues.push(`${pkg}: ${[...versions].join(", ")}`);
      }
    }

    if (issues.length > 0) {
      this.fail(issues);
      return false;
    }
    this.pass("No duplicates");
    return true;
  }
}

class NoDuplicateDepsRule extends Rule {
  check() {
    const issues = [];

    for (const { file, json } of getPackageJsons()) {
      const deps = Object.keys(json.dependencies || {});
      const devDeps = Object.keys(json.devDependencies || {});
      const dupes = deps.filter((d) => devDeps.includes(d));
      if (dupes.length > 0) {
        issues.push(`${file}: ${dupes.join(", ")}`);
      }
    }

    if (issues.length > 0) {
      this.fail(issues);
      return false;
    }
    this.pass("No deps in both dependencies and devDependencies");
    return true;
  }
}

class BannedPackageRule extends Rule {
  constructor(name, banned) {
    super(name);
    // banned: [{ pkg: "moment", reason: "Use date-fns" }]
    this.banned = banned;
  }

  check() {
    const issues = [];

    for (const { pkg, reason } of this.banned) {
      const versions = yarnWhy(pkg);
      if (versions.size > 0) {
        issues.push(`${pkg} found (${[...versions].join(", ")}): ${reason}`);
      }
    }

    if (issues.length > 0) {
      this.fail(issues);
      return false;
    }
    this.pass("No banned packages");
    return true;
  }
}

class NoResolutionDriftRule extends Rule {
  check() {
    const root = getPackageJsons().find(
      ({ file }) => file === path.join(process.cwd(), "package.json"),
    );
    if (!root || !root.json.resolutions) {
      this.pass("No resolutions defined");
      return true;
    }

    const issues = [];

    for (const [pattern, expected] of Object.entries(root.json.resolutions)) {
      // Extract bare package name from resolution pattern
      // Handles: "pkg", "**/pkg", "parent/pkg"
      const pkg =
        pattern
          .split("/")
          .filter((s) => !s.startsWith("*"))
          .join("/") || pattern;

      const resolved = yarnWhy(pkg);
      if (resolved.size === 0) continue;

      for (const ver of resolved) {
        if (!semver.satisfies(ver, expected)) {
          issues.push(`${pkg}: resolution says ${expected}, resolved ${ver}`);
        }
      }
    }

    if (issues.length > 0) {
      this.fail(issues);
      return false;
    }
    this.pass("All resolutions match resolved versions");
    return true;
  }
}

class PeerDepSatisfiedRule extends Rule {
  constructor(name, packages) {
    super(name);
    this.packages = packages;
  }

  check() {
    const issues = [];
    const nmBase = path.join(process.cwd(), "node_modules");

    for (const pkg of this.packages) {
      const pkgJsonPath = path.join(nmBase, pkg, "package.json");
      if (!fs.existsSync(pkgJsonPath)) continue;

      const json = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
      const peers = json.peerDependencies || {};

      for (const [peer, range] of Object.entries(peers)) {
        const resolved = yarnWhy(peer);
        if (resolved.size === 0) {
          // Check if it's optional
          const optional = json.peerDependenciesMeta?.[peer]?.optional;
          if (!optional) {
            issues.push(`${pkg} needs ${peer}@${range}: not installed`);
          }
        }
      }
    }

    if (issues.length > 0) {
      this.fail(issues);
      return false;
    }
    this.pass("All required peer deps installed");
    return true;
  }
}

class NodeModulesHealthRule extends Rule {
  constructor(name, { maxDepthWarn = 5, maxSizeMB = 2000, maxPkgCount = 3000 } = {}) {
    super(name);
    this.maxDepthWarn = maxDepthWarn;
    this.maxSizeMB = maxSizeMB;
    this.maxPkgCount = maxPkgCount;
  }

  check() {
    const nmPath = path.join(process.cwd(), "node_modules");
    if (!fs.existsSync(nmPath)) {
      this.pass("No node_modules found");
      return true;
    }

    const issues = [];
    const warnings = [];

    // Package count
    const pkgCount = this.#countPackages(nmPath);
    if (pkgCount > this.maxPkgCount) {
      issues.push(`${pkgCount} packages installed (threshold: ${this.maxPkgCount})`);
    }

    // Max nesting depth
    const maxDepth = this.#maxNestingDepth(nmPath);
    if (maxDepth > this.maxDepthWarn) {
      warnings.push(`Max nesting depth: ${maxDepth} (threshold: ${this.maxDepthWarn})`);
    }

    // Disk size
    const sizeMB = this.#getDiskSizeMB(nmPath);
    if (sizeMB > this.maxSizeMB) {
      issues.push(`node_modules is ${sizeMB}MB (threshold: ${this.maxSizeMB}MB)`);
    }

    // Top 10 heaviest packages
    const heaviest = this.#heaviestPackages(nmPath, 10);
    if (heaviest.length > 0) {
      console.log(`  [${this.name}] Top 10 heaviest:`);
      for (const { name, sizeMB } of heaviest) {
        console.log(`    ${sizeMB.toFixed(1)}MB  ${name}`);
      }
    }

    if (warnings.length > 0) {
      console.warn(`WARN [${this.name}]:`);
      warnings.forEach((w) => console.warn(`  ${w}`));
    }

    if (issues.length > 0) {
      this.fail(issues);
      return false;
    }

    this.pass(`${pkgCount} packages, ${sizeMB}MB, max depth ${maxDepth}`);
    return true;
  }

  #countPackages(nmPath) {
    let count = 0;
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const full = path.join(dir, entry.name);
        if (entry.name.startsWith("@")) {
          // Scoped package — go one level deeper
          walk(full);
        } else if (entry.name !== ".cache" && entry.name !== ".bin") {
          count++;
          // Check for nested node_modules
          const nested = path.join(full, "node_modules");
          if (fs.existsSync(nested)) walk(nested);
        }
      }
    };
    walk(nmPath);
    return count;
  }

  #maxNestingDepth(nmPath, depth = 0) {
    let max = depth;
    for (const entry of fs.readdirSync(nmPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const full = path.join(nmPath, entry.name);
      if (entry.name === "node_modules") {
        max = Math.max(max, this.#maxNestingDepth(full, depth + 1));
      } else if (entry.name.startsWith("@")) {
        // Scoped — look inside for nested node_modules
        for (const sub of fs.readdirSync(full, { withFileTypes: true })) {
          if (!sub.isDirectory()) continue;
          const nested = path.join(full, sub.name, "node_modules");
          if (fs.existsSync(nested)) {
            max = Math.max(max, this.#maxNestingDepth(nested, depth + 1));
          }
        }
      } else {
        const nested = path.join(full, "node_modules");
        if (fs.existsSync(nested)) {
          max = Math.max(max, this.#maxNestingDepth(nested, depth + 1));
        }
      }
    }
    return max;
  }

  #getDiskSizeMB(dir) {
    try {
      const out = execSync(`du -sm "${dir}"`, { encoding: "utf-8" });
      return parseInt(out.split("\t")[0], 10);
    } catch {
      return 0;
    }
  }

  #heaviestPackages(nmPath, top = 10) {
    const sizes = [];
    const measure = (dir, prefix = "") => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const full = path.join(dir, entry.name);
        if (entry.name.startsWith("@")) {
          measure(full, entry.name + "/");
        } else if (entry.name !== ".cache" && entry.name !== ".bin") {
          sizes.push({ name: prefix + entry.name, sizeMB: this.#getDiskSizeMB(full) });
        }
      }
    };
    measure(nmPath);
    return sizes.sort((a, b) => b.sizeMB - a.sizeMB).slice(0, top);
  }
}
class StaleResolutionRule extends Rule {
  level = "warn";

  check() {
    const root = getPackageJsons().find(
      ({ file }) => file === path.join(process.cwd(), "package.json"),
    );
    if (!root || !root.json.resolutions) {
      this.pass("No resolutions defined");
      return true;
    }

    const issues = [];
    const out = getInstallWarnings();

    for (const line of out) {
      const match = line.match(
        /Resolution field "(.+?)@(.+?)" is incompatible with requested version ".+?@(.+?)"/,
      );
      if (match) {
        const [, pkg, pinned, requested] = match;
        issues.push(`${pkg}: pinned ${pinned}, but ${requested} requested`);
      }
    }

    if (issues.length > 0) {
      this.fail(issues);
      return false;
    }
    this.pass("All resolutions compatible");
    return true;
  }
}

class UnmetPeerDepsRule extends Rule {
  level = "warn";
  check() {
    const lines = getInstallWarnings();
    const unmet = [];
    const incorrect = [];

    for (const line of lines) {
      const unmetMatch = line.match(/warning "(.+?)" has unmet peer dependency "(.+?)"/);
      if (unmetMatch) {
        unmet.push({ source: unmetMatch[1], dep: unmetMatch[2] });
        continue;
      }

      const incorrectMatch = line.match(/warning "(.+?)" has incorrect peer dependency "(.+?)"/);
      if (incorrectMatch) {
        incorrect.push({ source: incorrectMatch[1], dep: incorrectMatch[2] });
      }
    }

    const issues = [];
    if (unmet.length > 0) {
      issues.push(`Unmet peer deps (${unmet.length}):`);
      for (const { source, dep } of unmet) {
        issues.push(`  ${source} → needs ${dep}`);
      }
    }
    if (incorrect.length > 0) {
      issues.push(`Incorrect peer deps (${incorrect.length}):`);
      for (const { source, dep } of incorrect) {
        issues.push(`  ${source} → wants ${dep}`);
      }
    }

    if (issues.length > 0) {
      this.fail(issues);
      return false;
    }
    this.pass("No peer dep issues");
    return true;
  }
}

class NonDeterministicInstallRule extends Rule {
  level = "warn";
  check() {
    const lines = getInstallWarnings();
    const issues = [];

    for (const line of lines) {
      const match = line.match(
        /Pattern \["(.+?)"\] is trying to unpack in the same destination .+ as pattern \["(.+?)"\]/,
      );
      if (match) {
        issues.push(`${match[1]} conflicts with ${match[2]}`);
      }
    }

    if (issues.length > 0) {
      this.fail(issues);
      return false;
    }
    this.pass("No non-deterministic patterns");
    return true;
  }
}

// Config

const rules = [
  new ExactVersionMatchRule("Vue ecosystem", [
    "vue",
    "@vue/runtime-core",
    "@vue/server-renderer",
    "@vue/compiler-sfc",
    "@vue/compiler-core",
    "@vue/compiler-dom",
    "@vue/reactivity",
    "@vue/shared",
  ]),
  new ExactVersionMatchRule("Nuxt ecosystem", [
    "nuxt",
    "@nuxt/kit",
    "@nuxt/schema",
    "@nuxt/vite-builder",
  ]).setLevel("warn"),
  new ExactVersionMatchRule("TypeScript", ["typescript"]),
  new ExactVersionMatchRule("Typescript ESLint ecosystem", [
    "typescript-eslint",
    "@typescript-eslint/parser",
    "@typescript-eslint/types",
    "@typescript-eslint/utils",
    "@typescript-eslint/eslint-plugin",
  ]),
  new SingleVersionRule("No duplicate singletons", [
    "vue-router",
    "pinia",
    "h3",
    "ofetch",
    "vite",
    "unhead",
    "nitropack",
  ]).setLevel("warn"),
  new NoDuplicateDepsRule("No deps/devDeps overlap"),
  new BannedPackageRule("Banned packages", [
    { pkg: "moment", reason: "Use date-fns or dayjs" },
    { pkg: "webpack", reason: "Vite-only monorepo" },
  ]),
  new NoResolutionDriftRule("Resolution drift"),
  new PeerDepSatisfiedRule("Peer deps satisfied", [
    "vue",
    "nuxt",
    "vite",
    "@vitejs/plugin-vue",
    "eslint-plugin-vue",
    "pinia",
    "vue-router",
  ]),
  new NodeModulesHealthRule("node_modules health", {
    maxDepthWarn: 5,
    maxSizeMB: 2000,
    maxPkgCount: 3000,
  }).setLevel("warn"),
  new StaleResolutionRule("Stale resolutions"),
  new UnmetPeerDepsRule("Unmet peer dependencies"),
  new NonDeterministicInstallRule("Non-deterministic install patterns"),
];

let ok = true;
for (const rule of rules) {
  if (!rule.check() && rule.level === "error") ok = false;
}

console.log(ok ? "\n✓ All checks passed" : "\n✗ Some checks failed");
process.exit(ok ? 0 : 1);
