import { describe, expect, it } from "vitest";
import * as _Path from "./path";

describe("convertPath", () => {
  it("can convert paths without error", () => {
    expect(() => {
      _Path.convertPath("C:\\Users\\Test", "posix");
      _Path.convertPath("/C/Users/Test", "windows");
    }).not.toThrow();
  });
  it("correctly converts Windows to POSIX paths", () => {
    // Converts "C:\Users\Test" to "/C/Users/Test"
    const posixPath = _Path.convertPath("C:\\Users\\Test", "posix");
    expect(posixPath).toBe("/C/Users/Test");
  });
  it("correctly converts POSIX to Windows paths", () => {
    // Converts "/C/Users/Test" to "C:\Users\Test"
    const windowsPath = _Path.convertPath("/C/Users/Test", "windows");
    expect(windowsPath).toBe("C:\\Users\\Test");
  });
  it("handles edge cases", () => {
    // Converts "D:\Folder\Subfolder\File.txt" to "/D/Folder/Subfolder/File.txt"
    const posixPath = _Path.convertPath("D:\\Folder\\Subfolder\\File.txt", "posix");
    expect(posixPath).toBe("/D/Folder/Subfolder/File.txt");

    // Converts "/D/Folder/Subfolder/File.txt" to "D:\Folder\Subfolder\File.txt"
    const windowsPath = _Path.convertPath("/D/Folder/Subfolder/File.txt", "windows");
    expect(windowsPath).toBe("D:\\Folder\\Subfolder\\File.txt");
  });
  it("cycles correctly", () => {
    // Converts a Windows path to POSIX and back to Windows
    const originalWindowsPath = "E:\\Path\\To\\File.txt";
    const convertedToPosix = _Path.convertPath(originalWindowsPath, "posix");
    const convertedBackToWindows = _Path.convertPath(convertedToPosix, "windows");
    expect(convertedBackToWindows).toBe(originalWindowsPath);

    const originalPosixPath = "/E/Path/To/File.txt";
    const convertedToWindows = _Path.convertPath(originalPosixPath, "windows");
    const convertedBackToPosix = _Path.convertPath(convertedToWindows, "posix");
    expect(convertedBackToPosix).toBe(originalPosixPath);
  });
  it("converts posix path that does not start with a drive letter correctly", () => {
    let posixPath = _Path.convertPath("/usr/local/bin", "windows");
    expect(posixPath).toBe("\\usr\\local\\bin");

    posixPath = _Path.convertPath("usr/local/bin", "windows");
    expect(posixPath).toBe("usr\\local\\bin");
  });
  it("converts windows path that does not start with a drive letter correctly", () => {
    let windowsPath = _Path.convertPath("\\usr\\local\\bin", "posix");
    expect(windowsPath).toBe("/usr/local/bin");

    windowsPath = _Path.convertPath("usr\\local\\bin", "posix");
    expect(windowsPath).toBe("usr/local/bin");
  });
});
