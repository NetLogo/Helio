import child_process from "child_process";
import fs from "fs";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appendGitMetadata, generateGitMetadata } from "./index";

vi.mock("child_process");
vi.mock("fs");

describe("Git Metadata", () => {
  describe("appendGitMetadata", () => {
    it("should return existing metadata if source is missing", () => {
      const existing = { title: "Test" };
      const gitMetadata = {};
      expect(appendGitMetadata(existing, gitMetadata)).toBe(existing);
    });

    it("should return existing metadata if git metadata for source is missing", () => {
      const existing = { source: "file.ts" };
      const gitMetadata = {};
      expect(appendGitMetadata(existing, gitMetadata)).toBe(existing);
    });

    it("should merge git metadata when available", () => {
      const existing = { source: "file.ts", title: "Test" };
      const gitMetadata = {
        "file.ts": {
          createdDate: "2023-01-01",
          lastModifiedDate: "2023-01-02",
          authors: ["Author"],
          lastModifiedAuthor: "Author",
        },
      };
      const result = appendGitMetadata(existing, gitMetadata);
      expect(result).toEqual({
        ...existing,
        ...gitMetadata["file.ts"],
      });
    });
  });

  describe("generateGitMetadata", () => {
    afterEach(() => {
      vi.resetAllMocks();
    });

    it("should generate metadata for files", () => {
      const scanRoot = "/scan/root";
      const projectRoot = "/project/root";

      // Mock fs.readdirSync
      vi.mocked(fs.readdirSync).mockReturnValue([
        {
          name: "file.ts",
          isFile: () => true,
          parentPath: scanRoot,
          isDirectory: () => false,
          isBlockDevice: () => false,
          isCharacterDevice: () => false,
          isSymbolicLink: () => false,
          isFIFO: () => false,
          isSocket: () => false,
        } as any,
      ]);

      // Mock child_process.execSync
      vi.mocked(child_process.execSync).mockReturnValue(
        Buffer.from("2023-01-02 Author Two\n2023-01-01 Author One"),
      );

      const result = generateGitMetadata(scanRoot, projectRoot, undefined); // undefined outputFile to skip write

      const relativePath = path.relative(process.cwd(), path.join(scanRoot, "file.ts"));

      expect(result[relativePath]).toBeDefined();
      expect(result[relativePath].createdDate).toBe("2023-01-01");
      expect(result[relativePath].lastModifiedDate).toBe("2023-01-02");
      expect(result[relativePath].authors).toContain("Author One");
      expect(result[relativePath].authors).toContain("Author Two");
      expect(result[relativePath].lastModifiedAuthor).toBe("Author Two");
    });

    it("should handle git errors gracefully", () => {
      const scanRoot = "/scan/root";

      vi.mocked(fs.readdirSync).mockReturnValue([
        {
          name: "file.ts",
          isFile: () => true,
          parentPath: scanRoot,
          isDirectory: () => false,
          isBlockDevice: () => false,
          isCharacterDevice: () => false,
          isSymbolicLink: () => false,
          isFIFO: () => false,
          isSocket: () => false,
        } as any,
      ]);

      vi.mocked(child_process.execSync).mockImplementation(() => {
        throw new Error("Git error");
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = generateGitMetadata(scanRoot, undefined, undefined);

      const relativePath = path.relative(process.cwd(), path.join(scanRoot, "file.ts"));
      expect(result[relativePath]).toBeDefined();
      // Should return empty/default metadata on error, but schema parsing might fail if not handled.
      // The code returns `GitMetadataSchema.parse({})` which might throw if schema has required fields.
      // Let's check schema.

      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
