#!/usr/bin/env node
/* Checks for multiple versions of a package in the dependency tree. Usage:
 *   node scripts/check-dupes.js <package>
 * */

const { execSync } = require("child_process");

const pkg = process.argv[2];
if (!pkg) {
  console.error("Usage: node scripts/check-dupes.js <package>");
  process.exit(1);
}

const output = execSync(`yarn why ${pkg} 2>&1`, { encoding: "utf-8" });
const versions = [...output.matchAll(/Found "(?:.*?)@(.+?)"/g)].map((m) => m[1]);
const unique = [...new Set(versions)];

if (unique.length <= 1) {
  console.log(`${pkg}: ${unique[0] || "not found"}`);
} else {
  console.log(`${pkg}: ${unique.length} versions — ${unique.join(", ")}`);
  process.exit(1);
}
