#!/usr/bin/env node
const { execSync } = require("child_process");

class Rule {
  constructor(name) {
    this.name = name;
  }

  check() {
    throw new Error("Not implemented");
  }
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
      const versions = this.#getResolvedVersions(pkg);

      for (const v of versions) allVersions.add(v);

      if (versions.size === 0) {
        issues.push(`  ${pkg}: not found`);
      } else if (versions.size > 1) {
        issues.push(`  ${pkg}: dupes → ${[...versions].join(", ")}`);
      }
    }

    if (allVersions.size > 1) {
      issues.push(`  Cross-package mismatch: ${[...allVersions].join(", ")}`);
    }

    if (issues.length === 0) {
      console.log(`OK [${this.name}]: All on ${[...allVersions][0]}`);
      return true;
    }

    console.error(`FAIL [${this.name}]:`);
    issues.forEach((i) => console.error(i));
    return false;
  }

  #getResolvedVersions(pkg) {
    const versions = new Set();
    try {
      const out = execSync(`yarn why ${pkg} --json`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      for (const line of out.trim().split("\n").filter(Boolean)) {
        const entry = JSON.parse(line);
        if (entry.type !== "info" || typeof entry.data !== "string") continue;
        const match = entry.data.match(/Found ".+@(\d+\..+?)"/);
        if (match) versions.add(match[1]);
      }
    } catch {}
    return versions;
  }
}

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
];

let ok = true;
for (const rule of rules) {
  if (!rule.check()) ok = false;
}
process.exit(ok ? 0 : 1);
