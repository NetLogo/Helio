import { spawnSync } from "child_process";
import { chmodSync, copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { createRequire } from "module";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { parseLock, resolvedSet } = require("./lib/yarn-lock.js");
const { parseYarnWhy } = require("./lib/yarn-why.js");
const { findEntries } = require("./lockfile-at.js");
const { compareLocks } = require("./lock-parity.js");

const SCRIPTS = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(SCRIPTS, "fixtures");
const fixture = (name) => readFileSync(join(FIXTURES, name), "utf8");
const V1 = fixture("yarn-v1.lock");
const BERRY = fixture("yarn-berry.lock");

const tempDirs = [];
function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), "helio-scripts-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length) rmSync(tempDirs.pop(), { recursive: true, force: true });
});

const run = (args, options = {}) => spawnSync(process.execPath, args, { encoding: "utf-8", ...options });

describe("parseLock", () => {
  it("detects the format", () => {
    expect(parseLock(V1).format).toBe("v1");
    expect(parseLock(BERRY).format).toBe("berry");
  });

  it("reads names and versions from Yarn 1 headers", () => {
    const [first, second] = parseLock(V1).entries;
    expect(first.names).toEqual(["@babel/code-frame"]);
    expect(first.version).toBe("7.27.1");
    expect(second.version).toBe("7.29.7");
  });

  it("reads multi-descriptor Berry headers and skips __metadata", () => {
    const { entries } = parseLock(BERRY);
    expect(entries[0].header.startsWith("__metadata")).toBe(false);
    expect(entries[0].descriptors).toEqual([
      "@babel/code-frame@npm:^7.0.0",
      "@babel/code-frame@npm:^7.12.13",
      "@babel/code-frame@npm:^7.27.1",
    ]);
    expect(entries[0].names).toEqual(["@babel/code-frame"]);
    expect(entries[0].version).toBe("7.27.1");
  });

  it("keeps alias names and names patch descriptors after the package", () => {
    for (const text of [V1, BERRY]) {
      const alias = parseLock(text).entries.find((e) => e.names.includes("string-width-cjs"));
      expect(alias.names).toEqual(["string-width-cjs", "string-width"]);
    }
    const patch = parseLock(BERRY).entries.find((e) => e.header.startsWith('"typescript@patch:'));
    expect(patch.names).toEqual(["typescript"]);
    expect(patch.version).toBe("5.9.3");
  });

  it("flags Berry workspace entries", () => {
    const helio = parseLock(BERRY).entries.find((e) => e.names.includes("helio"));
    expect(helio.workspace).toBe(true);
  });
});

describe("lockfile-at", () => {
  it.each([
    ["v1", V1],
    ["berry", BERRY],
  ])("returns every consecutive entry for a package (%s)", (_, text) => {
    const entries = findEntries(text, (name) => name === "esbuild");
    expect(entries.map((e) => e.version)).toEqual(["0.25.12", "0.27.0", "0.28.2"]);
    expect(entries.every((e) => e.body.every((line) => line.startsWith("  ")))).toBe(true);
  });

  it.each(["yarn-v1.lock", "yarn-berry.lock"])("prints 3 esbuild entries from %s at a git ref", (name) => {
    const repo = tempDir();
    copyFileSync(join(FIXTURES, name), join(repo, "yarn.lock"));
    const git = (...args) =>
      spawnSync("git", ["-c", "user.name=test", "-c", "user.email=test@example.com", ...args], {
        cwd: repo,
        encoding: "utf-8",
      });
    git("init", "-q");
    git("add", "yarn.lock");
    git("commit", "-q", "-m", "fixture");

    const result = run([join(SCRIPTS, "lockfile-at.js"), "esbuild"], { cwd: repo });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('HEAD: 3 entry(s) for "esbuild"');
    expect(result.stdout).not.toContain("escalade");
    expect(result.stdout).not.toContain("es-to-primitive");
  });
});

describe("lock-parity", () => {
  it("excludes workspaces and finds the same set in both formats", () => {
    expect(resolvedSet(BERRY).has("helio@0.0.0-use.local")).toBe(false);
    expect(compareLocks(V1, BERRY)).toEqual({ sizeA: 10, sizeB: 10, onlyA: [], onlyB: [] });
  });

  it("reports a changed version on both sides", () => {
    const drifted = BERRY.replace("version: 3.2.0", "version: 3.2.1");
    const { onlyA, onlyB } = compareLocks(V1, drifted);
    expect(onlyA).toEqual(["escalade@3.2.0"]);
    expect(onlyB).toEqual(["escalade@3.2.1"]);
  });

  it("exits 0 on parity and 1 on drift", () => {
    const script = join(SCRIPTS, "lock-parity.js");
    expect(run([script, join(FIXTURES, "yarn-v1.lock"), join(FIXTURES, "yarn-berry.lock")]).status).toBe(0);

    const drifted = join(tempDir(), "yarn.lock");
    writeFileSync(drifted, V1.replace('version "3.2.0"', 'version "3.2.1"'));
    const result = run([script, join(FIXTURES, "yarn-v1.lock"), drifted]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("escalade@3.2.0");
  });
});

describe("parseYarnWhy", () => {
  it("collects hoisted and nested versions", () => {
    expect(parseYarnWhy(fixture("yarn-why-dupes.jsonl"))).toEqual(["7.2.0", "9.0.1"]);
  });

  it("strips the scope when reading a scoped version", () => {
    expect(parseYarnWhy(fixture("yarn-why-scoped.jsonl"))).toEqual(["3.5.44"]);
  });

  it("treats Yarn's explicit no-match error as not installed", () => {
    expect(parseYarnWhy(fixture("yarn-why-missing.stdout.jsonl"), fixture("yarn-why-missing.stderr.txt"))).toEqual([]);
  });

  it("throws on output that is not Yarn 1 JSON", () => {
    expect(() => parseYarnWhy("└─ hastscript@npm:7.2.0\n")).toThrow(/unparseable/);
  });

  it("throws on JSON that names neither a version nor a no-match error", () => {
    const unrecognized = '{"value":"@repo/markdown@workspace:packages/markdown","children":{}}\n';
    expect(() => parseYarnWhy(unrecognized)).toThrow(/neither a version nor a no-match/);
  });

  it("throws on any other yarn error", () => {
    expect(() => parseYarnWhy("", '{"type":"error","data":"Missing list of packages"}\n')).toThrow(/yarn why failed/);
  });
});

describe("check-dupes", () => {
  function checkDupes({ stdout = "", stderr = "", status = 0 }) {
    const bin = tempDir();
    writeFileSync(join(bin, "stdout"), stdout);
    writeFileSync(join(bin, "stderr"), stderr);
    writeFileSync(join(bin, "yarn"), `#!/bin/sh\ncat "${bin}/stdout"\ncat "${bin}/stderr" >&2\nexit ${status}\n`);
    chmodSync(join(bin, "yarn"), 0o755);
    return run([join(SCRIPTS, "check-dupes.js"), "pkg"], {
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
    });
  }

  it.skipIf(process.platform === "win32")("exits 1 on two versions", () => {
    const result = checkDupes({ stdout: fixture("yarn-why-dupes.jsonl") });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("2 versions: 7.2.0, 9.0.1");
  });

  it.skipIf(process.platform === "win32")("exits 0 on one version and on no match", () => {
    expect(checkDupes({ stdout: fixture("yarn-why-scoped.jsonl") }).stdout).toContain("pkg: 3.5.44");
    const missing = checkDupes({
      stdout: fixture("yarn-why-missing.stdout.jsonl"),
      stderr: fixture("yarn-why-missing.stderr.txt"),
    });
    expect(missing.status).toBe(0);
    expect(missing.stdout).toContain("pkg: not found");
  });

  it.skipIf(process.platform === "win32")("exits 2 when the output cannot be read or yarn fails", () => {
    expect(checkDupes({ stdout: "└─ pkg@npm:1.0.0\n" }).status).toBe(2);
    expect(checkDupes({ stdout: '{"value":"x@workspace:.","children":{}}\n' }).status).toBe(2);
    expect(checkDupes({ stderr: "Usage Error\n", status: 1 }).status).toBe(2);
  });
});
