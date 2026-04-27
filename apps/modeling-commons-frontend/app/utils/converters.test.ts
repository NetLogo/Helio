import { describe, expect, it } from "vitest";
import { sizeToBytes } from "./converters";

describe("sizeToBytes", () => {
  it("returns the same number of bytes for B", () => {
    expect(sizeToBytes(10, "B")).toBe(10);
  });

  it("converts KB", () => {
    expect(sizeToBytes(1, "KB")).toBe(1024);
    expect(sizeToBytes(2, "KB")).toBe(2048);
  });

  it("converts MB", () => {
    expect(sizeToBytes(1, "MB")).toBe(1024 ** 2);
  });

  it("converts GB", () => {
    expect(sizeToBytes(1, "GB")).toBe(1024 ** 3);
  });

  it("treats unknown units as identity multiplier", () => {
    expect(sizeToBytes(5, "B" as never)).toBe(5);
    expect(sizeToBytes(7, "BOGUS" as never)).toBe(7);
  });
});
