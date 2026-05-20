import { describe, expect, it, vi } from "vitest";
import { createApiDateString } from "./api-shared";

describe("createApiDateString", () => {
  it("returns undefined for null, undefined, and empty string", () => {
    expect(createApiDateString(null)).toBeUndefined();
    expect(createApiDateString(undefined)).toBeUndefined();
    expect(createApiDateString("")).toBeUndefined();
  });

  it("formats a Date as YYYY-MM-DD", () => {
    const d = new Date("2026-04-27T15:30:00.000Z");
    expect(createApiDateString(d)).toBe("2026-04-27");
  });

  it("accepts an ISO string", () => {
    expect(createApiDateString("2026-01-15T12:00:00.000Z")).toBe("2026-01-15");
  });

  it("accepts a numeric timestamp", () => {
    const ts = Date.UTC(2026, 5, 1, 0, 0, 0);
    expect(createApiDateString(ts)).toBe("2026-06-01");
  });

  it("returns undefined for an invalid date string", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(createApiDateString("not-a-date")).toBeUndefined();
    vi.restoreAllMocks();
  });
});
