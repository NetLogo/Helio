#!/usr/bin/env node
/*
 * A simple script to extract the yarn.lock entry for a given package at a specific
 * git ref. Reads both the Yarn 1 and the Berry lockfile formats.
 *
 * Usage: yarn run lockfile-at [-E] <package> [git-ref]
 *
 * */

const { execSync: exec } = require("child_process");
const { parseLock } = require("./lib/yarn-lock");

function findEntries(lockContent, match) {
  return parseLock(lockContent).entries.filter((entry) => entry.names.some(match));
}

function main() {
  const help = () => {
    console.error("Usage: node scripts/lockfile-at.js [-E] <package> [git-ref]");
    console.error("  git-ref defaults to HEAD");
    process.exit(1);
  };

  const argv = process.argv.slice(2);
  const FLAG_PATTERN = /^-([E]+)$/;
  const flagMatch = FLAG_PATTERN.exec(argv[0]);
  const flags = new Set(flagMatch ? flagMatch[1].split("") : []);
  const args = flagMatch ? argv.slice(1) : argv;

  if (args.length < 1 || args.length > 2) help();

  const [pkg, ref = "HEAD"] = args;
  const match = flags.has("E") ? (name) => new RegExp(pkg).test(name) : (name) => name === pkg;
  const gitRef = ref || "HEAD";

  let lockContent;
  try {
    lockContent = exec(`git show ${gitRef}:yarn.lock`, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (e) {
    console.error(`Failed to read yarn.lock at ${gitRef}`);
    process.exit(1);
  }

  const entries = findEntries(lockContent, match);

  if (entries.length === 0) {
    console.log(`No entries for "${pkg}" at ${gitRef}`);
    process.exit(0);
  }

  console.log(`${gitRef}: ${entries.length} entry(s) for "${pkg}":\n`);
  for (const entry of entries) {
    console.log(entry.header);
    for (const line of entry.body) console.log(line);
    console.log("");
  }
}

if (require.main === module) main();

module.exports = { findEntries };
