import fs from "fs";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { saveToPublicDir } from "./server";

vi.mock("fs");

describe("saveToPublicDir", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should save content to public directory", () => {
    const filePath = ["subdir", "file.txt"];
    const content = "hello world";
    const cwd = "/current/working/dir";

    const spyCwd = vi.spyOn(process, "cwd").mockReturnValue(cwd);

    saveToPublicDir(filePath, content);

    const expectedFullPath = path.join(cwd, "public", "subdir", "file.txt");
    const expectedDir = path.dirname(expectedFullPath);

    expect(fs.mkdirSync).toHaveBeenCalledWith(expectedDir, { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(expectedFullPath, content, "utf-8");

    spyCwd.mockRestore();
  });
});
