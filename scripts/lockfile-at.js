#!/usr/bin/env node
/*
 * A simple script to extract the yarn.lock entry for a given package at a specific
 * git ref.
 *
 * Usage: yarn run lockfile-at [-E] <package> [git-ref]
 *
 * */

const { execSync } = require("fs");
const { execSync: exec } = require("child_process");

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

const lines = lockContent.split("\n");
const entries = [];
let current = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (!line.startsWith(" ") && !line.startsWith("#") && line.trim() !== "") {
    const names = line
      .replace(/:$/, "")
      .split(",")
      .map((s) => s.trim().replace(/^"(.*)"$/, "$1"));
    const matches = names.some((n) => {
      const atIdx = n.lastIndexOf("@");
      if (atIdx <= 0) return false;
      const name = n.substring(0, atIdx);
      return match(name);
    });

    if (matches) {
      current = { header: line, body: [] };
    } else if (current) {
      entries.push(current);
      current = null;
    }
  }

  if (current && line !== current.header) {
    current.body.push(line);
  }
}

if (current) entries.push(current);

if (entries.length === 0) {
  console.log(`No entries for "${pkg}" at ${gitRef}`);
  process.exit(0);
}

console.log(`${gitRef} — ${entries.length} entry(s) for "${pkg}":\n`);
for (const entry of entries) {
  console.log(entry.header);
  for (const line of entry.body) {
    if (line.trim() !== "") {
      console.log(line);
    }
  }
  console.log("");
}
