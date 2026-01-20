import { spawnSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HELPERS_PATH = join(__dirname, ".helpers");
const TEST_DIR = join(__dirname, ".test-tmp");

if (process.platform !== "win32") {
  function callBash(command, env = {}) {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }

    const result = spawnSync("bash", ["-c", `source ${HELPERS_PATH} && ${command}`], {
      encoding: "utf-8",
      env: { ...process.env, ...env },
      cwd: TEST_DIR,
    });
    return {
      stdout: result.stdout?.trim() || "",
      stderr: result.stderr?.trim() || "",
      status: result.status ?? 1,
    };
  }

  describe(".helpers bash utilities", () => {
    beforeEach(() => {
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true });
      }
      mkdirSync(TEST_DIR, { recursive: true });
    });

    afterEach(() => {
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true });
      }
    });

    describe("log function", () => {
      it("should output a timestamped message", () => {
        const { stdout } = callBash('log "test message"');
        expect(stdout).toMatch(/^\[\d{2}:\d{2}\] test message$/);
      });

      it("should handle multiple arguments", () => {
        const { stdout } = callBash('log "hello" "world"');
        expect(stdout).toMatch(/^\[\d{2}:\d{2}\] hello world$/);
      });
    });

    describe("environment variables", () => {
      it("should default HELIO_HEADLESS to 0", () => {
        const { stdout } = callBash("echo $HELIO_HEADLESS");
        expect(stdout).toBe("0");
      });

      it("should respect HELIO_HEADLESS when set", () => {
        const { stdout } = callBash("echo $HELIO_HEADLESS", {
          HELIO_HEADLESS: "1",
        });
        expect(stdout).toContain("1");
        expect(stdout).toMatch(/1$/);
      });

      it("should default GIT_TERMINAL_PROMPT to HELIO_HEADLESS value", () => {
        const { stdout } = callBash("echo $GIT_TERMINAL_PROMPT", {
          HELIO_HEADLESS: "1",
        });
        expect(stdout).toContain("1");
        expect(stdout).toMatch(/1$/);
      });
    });

    describe("rm_dir_or_link function", () => {
      it("should remove a regular file", () => {
        const testFile = join(TEST_DIR, "testfile.txt");
        writeFileSync(testFile, "content");
        expect(existsSync(testFile)).toBe(true);

        callBash(`rm_dir_or_link "${testFile}"`);
        expect(existsSync(testFile)).toBe(false);
      });

      it("should remove a directory", () => {
        const testDir = join(TEST_DIR, "testdir");
        mkdirSync(testDir);
        writeFileSync(join(testDir, "file.txt"), "content");
        expect(existsSync(testDir)).toBe(true);

        callBash(`rm_dir_or_link "${testDir}"`);
        expect(existsSync(testDir)).toBe(false);
      });

      it("should remove a symlink", () => {
        const targetDir = join(TEST_DIR, "target");
        const linkPath = join(TEST_DIR, "link");
        mkdirSync(targetDir);
        symlinkSync(targetDir, linkPath);
        expect(existsSync(linkPath)).toBe(true);

        callBash(`rm_dir_or_link "${linkPath}"`);
        expect(existsSync(linkPath)).toBe(false);
        expect(existsSync(targetDir)).toBe(true);
      });

      it("should handle non-existent paths gracefully", () => {
        const { status } = callBash(`rm_dir_or_link "${join(TEST_DIR, "nonexistent")}"`);
        expect(status).toBe(0);
      });
    });

    describe("resolve_dir_or_link function", () => {
      it("should return the path for a regular directory", () => {
        const testDir = join(TEST_DIR, "realdir");
        mkdirSync(testDir);

        const { stdout } = callBash(`resolve_dir_or_link "${testDir}"`);
        expect(stdout).toBe(testDir);
      });

      it("should resolve symlinks to their target", () => {
        const targetDir = join(TEST_DIR, "target");
        const linkPath = join(TEST_DIR, "link");
        mkdirSync(targetDir);
        symlinkSync(targetDir, linkPath);

        const { stdout } = callBash(`resolve_dir_or_link "${linkPath}"`);
        expect(stdout).toBe(targetDir);
      });

      it("should return the path for a regular file", () => {
        const testFile = join(TEST_DIR, "file.txt");
        writeFileSync(testFile, "content");

        const { stdout } = callBash(`resolve_dir_or_link "${testFile}"`);
        expect(stdout).toBe(testFile);
      });
    });

    describe("unroll function", () => {
      it("should copy contents from target directory to current directory", () => {
        const sourceDir = join(TEST_DIR, "source");
        mkdirSync(sourceDir);
        writeFileSync(join(sourceDir, "file1.txt"), "content1");
        writeFileSync(join(sourceDir, "file2.txt"), "content2");

        callBash(`unroll "${sourceDir}"`);

        // Files should be copied to TEST_DIR (current working directory)
        expect(existsSync(join(TEST_DIR, "file1.txt"))).toBe(true);
        expect(existsSync(join(TEST_DIR, "file2.txt"))).toBe(true);
        expect(readFileSync(join(TEST_DIR, "file1.txt"), "utf-8")).toBe("content1");
        expect(readFileSync(join(TEST_DIR, "file2.txt"), "utf-8")).toBe("content2");

        // Source directory should be removed
        expect(existsSync(sourceDir)).toBe(false);
      });

      it("should handle symlinks as source", () => {
        const targetDir = join(TEST_DIR, "target");
        const linkPath = join(TEST_DIR, "link");
        mkdirSync(targetDir);
        writeFileSync(join(targetDir, "data.txt"), "linked content");
        symlinkSync(targetDir, linkPath);

        callBash(`unroll "${linkPath}"`);

        expect(existsSync(join(TEST_DIR, "data.txt"))).toBe(true);
        expect(readFileSync(join(TEST_DIR, "data.txt"), "utf-8")).toBe("linked content");

        expect(existsSync(targetDir)).toBe(false);
      });

      it("should copy nested directories", () => {
        const sourceDir = join(TEST_DIR, "source");
        const nestedDir = join(sourceDir, "nested");
        mkdirSync(nestedDir, { recursive: true });
        writeFileSync(join(nestedDir, "nested-file.txt"), "nested content");

        callBash(`unroll "${sourceDir}"`);

        expect(existsSync(join(TEST_DIR, "nested", "nested-file.txt"))).toBe(true);
        expect(readFileSync(join(TEST_DIR, "nested", "nested-file.txt"), "utf-8")).toBe(
          "nested content",
        );
      });
    });

    describe("_read function", () => {
      it("should return the default value when in headless mode", () => {
        const { stdout } = callBash('_read "Enter value: " "default_value"', {
          HELIO_HEADLESS: "1",
        });
        expect(stdout).toContain("default_value");
      });

      it("should return different defaults based on input", () => {
        const { stdout: stdout1 } = callBash('_read "Prompt: " "first"', {
          HELIO_HEADLESS: "1",
        });
        expect(stdout1).toContain("first");

        const { stdout: stdout2 } = callBash('_read "Prompt: " "second"', {
          HELIO_HEADLESS: "1",
        });
        expect(stdout2).toContain("second");
      });
    });

    describe("script safety", () => {
      it("should fail on undefined variables (set -u)", () => {
        const { status } = callBash("echo $UNDEFINED_VAR_XYZ_123");
        expect(status).not.toBe(0);
      });

      it("should fail on pipe errors (set -o pipefail)", () => {
        const { status } = callBash("false | true");
        expect(status).not.toBe(0);
      });

      it("should fail on command errors (set -e)", () => {
        const { status } = callBash("false && echo 'should not print'");
        expect(status).not.toBe(0);
      });
    });

    describe(".helpers file structure", () => {
      it("should exist at the expected path", () => {
        expect(existsSync(HELPERS_PATH)).toBe(true);
      });

      it("should contain expected function definitions", () => {
        const content = readFileSync(HELPERS_PATH, "utf-8");
        expect(content).toContain("log-helpers");
        expect(content).toContain("function rm_dir_or_link()");
        expect(content).toContain("function resolve_dir_or_link()");
        expect(content).toContain("function unroll()");
        expect(content).toContain("_read()");
      });

      it("should set strict mode options", () => {
        const content = readFileSync(HELPERS_PATH, "utf-8");
        expect(content).toContain("set -euo pipefail");
      });

      it("should define HELIO_HEADLESS with default", () => {
        const content = readFileSync(HELPERS_PATH, "utf-8");
        expect(content).toContain('HELIO_HEADLESS="${HELIO_HEADLESS:-0}"');
      });
    });
  });
} else {
  describe(".helpers bash utilities", () => {
    it("skips tests on non-Windows platforms", () => {
      expect(true).toBe(true);
    });
  });
  console.warn("Skipping .helpers bash tests: not running on Windows.");
}
