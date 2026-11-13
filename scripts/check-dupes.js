#!/usr/bin/env node
/* Checks for multiple versions of a package in the dependency tree. Usage:
 *   node scripts/check-dupes.js <package>
 * Exits 1 on duplicates and 2 when yarn's output cannot be read.
 * */

const { yarnWhy } = require("./lib/yarn-why");

const pkg = process.argv[2];
if (!pkg) {
  console.error("Usage: node scripts/check-dupes.js <package>");
  process.exit(1);
}

let unique;
try {
  unique = yarnWhy(pkg);
} catch (e) {
  console.error(`check-dupes: ${e.message}`);
  process.exit(2);
}

if (unique.length <= 1) {
  console.log(`${pkg}: ${unique[0] || "not found"}`);
} else {
  console.log(`${pkg}: ${unique.length} versions: ${unique.join(", ")}`);
  process.exit(1);
}
