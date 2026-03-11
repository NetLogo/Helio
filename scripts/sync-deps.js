#!/usr/bin/env node

/**
 * sync-deps.js
 *
 * Reads the `resolutions` field from the root package.json and updates
 * every workspace package.json so that any matching dependency (in
 * dependencies, devDependencies, or peerDependencies) uses the resolved
 * version.
 *
 * Usage:
 *   node scripts/sync-deps.js            # preview changes (dry run)
 *   node scripts/sync-deps.js --write    # apply changes
 *   node scripts/sync-deps.js --check    # exit 1 if anything is out of sync (CI)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// CLI flags
const args = new Set(process.argv.slice(2));
const WRITE = args.has("--write");
const CHECK = args.has("--check");

// Load root package.json
const rootPkgPath = path.resolve(__dirname, "..", "package.json");
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf-8"));
const resolutions = rootPkg.resolutions || {};

if (Object.keys(resolutions).length === 0) {
  console.log("No resolutions found in root package.json. Nothing to sync.");
  process.exit(0);
}

// Discover workspaces via yarn
function getWorkspacePaths() {
  // yarn 1 workspaces info returns JSON with location for each workspace
  try {
    const raw = execSync("yarn --silent workspaces info", {
      encoding: "utf-8",
    });
    const info = JSON.parse(raw);
    return Object.values(info).map((ws) => ws.location);
  } catch {
    // Fallback: read workspaces globs from root package.json and resolve
    const globs = rootPkg.workspaces || [];
    const flatGlobs = Array.isArray(globs) ? globs : globs.packages || [];
    const { globSync } = require("glob");
    return flatGlobs.flatMap((g) =>
      globSync(g, { cwd: path.dirname(rootPkgPath) })
    );
  }
}

const DEP_FIELDS = ["dependencies", "devDependencies", "peerDependencies"];

function normalizeVersion(resolved) {
  // If the resolution is an exact version (no range prefix), keep it exact.
  // If it has ^/~ etc, keep as-is.
  return resolved;
}

// Main
const workspaces = getWorkspacePaths();
let totalChanges = 0;
const report = [];

for (const wsDir of workspaces) {
  const pkgPath = path.resolve(path.dirname(rootPkgPath), wsDir, "package.json");
  if (!fs.existsSync(pkgPath)) continue;

  const raw = fs.readFileSync(pkgPath, "utf-8");
  const pkg = JSON.parse(raw);
  const changes = [];

  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (!deps) continue;

    for (const [name, currentRange] of Object.entries(deps)) {
      if (!(name in resolutions)) continue;

      const target = normalizeVersion(resolutions[name]);

      // Skip workspace: protocol references
      if (currentRange.startsWith("workspace:")) continue;

      // Check if the declared range already satisfies the resolution
      if (currentRange === target) continue;

      changes.push({
        field,
        name,
        from: currentRange,
        to: target,
      });

      if (WRITE) {
        deps[name] = target;
      }
    }
  }

  if (changes.length > 0) {
    totalChanges += changes.length;
    report.push({ workspace: wsDir, package: pkg.name, changes });

    if (WRITE) {
      // Preserve original indentation
      const indent = raw.match(/^(\s+)"/m)?.[1] || "  ";
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, indent) + "\n");
    }
  }
}

// Output
if (report.length === 0) {
  console.log("[INFO] All workspace deps are in sync with root resolutions.");
  process.exit(0);
}

console.log(
  `\n${WRITE ? "[INFO]  Updated" : "[INFO] Found"} ${totalChanges} out-of-sync dep(s) across ${report.length} workspace(s):\n`
);

for (const { workspace, package: name, changes } of report) {
  console.log(`  📦 ${name || workspace}`);
  for (const c of changes) {
    console.log(`     ${c.field} → ${c.name}: ${c.from} → ${c.to}`);
  }
  console.log();
}

if (!WRITE && !CHECK) {
  console.log("Run with --write to apply changes, or --check for CI enforcement.\n");
}

if (CHECK && totalChanges > 0) {
  console.error("[ERROR] Deps out of sync. Run `yarn sync-deps --write` to fix.\n");
  process.exit(1);
}