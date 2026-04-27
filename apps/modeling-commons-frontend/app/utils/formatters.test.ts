import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendWindowProtocol,
  capitalize,
  createModelPath,
  formatBytes,
  formatCountdown,
  formatDate,
  formatRelativeDate,
  getModelVisibilityDisplayInfo,
  getTagColorClass,
  getVisibilityIcon,
  parseModelPath,
  pluralize,
  sentenceCase,
} from "./formatters";

describe("formatRelativeDate", () => {
  const NOW = new Date("2026-04-27T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' when within the same minute", () => {
    expect(formatRelativeDate(new Date(NOW.getTime() - 5_000).toISOString())).toBe("just now");
  });

  it("returns singular minute", () => {
    expect(formatRelativeDate(new Date(NOW.getTime() - 60_000).toISOString())).toBe("1 minute ago");
  });

  it("returns plural minutes", () => {
    expect(formatRelativeDate(new Date(NOW.getTime() - 5 * 60_000).toISOString())).toBe(
      "5 minutes ago",
    );
  });

  it("returns singular hour", () => {
    expect(formatRelativeDate(new Date(NOW.getTime() - 60 * 60_000).toISOString())).toBe(
      "1 hour ago",
    );
  });

  it("returns plural hours", () => {
    expect(formatRelativeDate(new Date(NOW.getTime() - 3 * 60 * 60_000).toISOString())).toBe(
      "3 hours ago",
    );
  });

  it("returns singular day", () => {
    expect(formatRelativeDate(new Date(NOW.getTime() - 24 * 60 * 60_000).toISOString())).toBe(
      "1 day ago",
    );
  });

  it("returns plural days", () => {
    expect(formatRelativeDate(new Date(NOW.getTime() - 3 * 24 * 60 * 60_000).toISOString())).toBe(
      "3 days ago",
    );
  });

  it("returns singular week", () => {
    expect(formatRelativeDate(new Date(NOW.getTime() - 7 * 24 * 60 * 60_000).toISOString())).toBe(
      "1 week ago",
    );
  });

  it("returns plural weeks", () => {
    expect(
      formatRelativeDate(new Date(NOW.getTime() - 2 * 7 * 24 * 60 * 60_000).toISOString()),
    ).toBe("2 weeks ago");
  });

  it("returns singular month", () => {
    expect(formatRelativeDate(new Date(NOW.getTime() - 30 * 24 * 60 * 60_000).toISOString())).toBe(
      "1 month ago",
    );
  });

  it("returns plural months", () => {
    expect(
      formatRelativeDate(new Date(NOW.getTime() - 3 * 30 * 24 * 60 * 60_000).toISOString()),
    ).toBe("3 months ago");
  });

  it("returns singular year", () => {
    expect(formatRelativeDate(new Date(NOW.getTime() - 365 * 24 * 60 * 60_000).toISOString())).toBe(
      "1 year ago",
    );
  });

  it("returns plural years", () => {
    expect(
      formatRelativeDate(new Date(NOW.getTime() - 3 * 365 * 24 * 60 * 60_000).toISOString()),
    ).toBe("3 years ago");
  });
});

describe("formatDate", () => {
  it("formats an ISO string as 'Month Day, Year'", () => {
    expect(formatDate("2026-04-27T00:00:00.000Z")).toMatch(/2026/);
    expect(formatDate("2026-04-27T12:00:00.000Z")).toContain("April");
  });
});

describe("getVisibilityIcon", () => {
  it("returns different values for public, private, unlisted and invalid", () => {
    const publicIcon = getVisibilityIcon("public");
    const privateIcon = getVisibilityIcon("private");
    const unlistedIcon = getVisibilityIcon("unlisted");
    const invalidIcon = getVisibilityIcon("invalid");

    expect(new Set([publicIcon, privateIcon, unlistedIcon, invalidIcon]).size).toBe(4);
  });
  it("returns a string that looks like an icon name", () => {
    const icon = getVisibilityIcon("public");
    expect(typeof icon).toBe("string");
    expect(icon).toMatch(/^i-lucide-/);
  });
  it("returns the same value for invalid values", () => {
    const icon1 = getVisibilityIcon("invalid");
    const icon2 = getVisibilityIcon("another-invalid");
    expect(icon1).toBe(icon2);
  });
});

describe("getTagColorClass", () => {
  it("is deterministic for the same input", () => {
    expect(getTagColorClass("foo")).toBe(getTagColorClass("foo"));
  });

  it("derives the class from the first char code", () => {
    for (let i = "A".charCodeAt(0); i <= "Z".charCodeAt(0); i++) {
      const char = String.fromCharCode(i);
      const variants = [`${char}foo`, `${char}bar`, `${char}baz`];
      const classes = variants.map(getTagColorClass);
      expect(new Set(classes).size).toBe(1); // All variants should yield the same class
    }
  });

  it("consecutive char codes should yield different classes", () => {
    const classA = getTagColorClass("A");
    const classB = getTagColorClass("B");
    expect(classA).not.toBe(classB);
  });
});

describe("pluralize", () => {
  it("returns just the singular when count is 1", () => {
    expect(pluralize(1, "model")).toBe("model");
  });

  it("appends 's' when count != 1 and no plural is given", () => {
    expect(pluralize(0, "model")).toBe("0 models");
    expect(pluralize(2, "model")).toBe("2 models");
  });

  it("uses an explicit plural form when provided", () => {
    expect(pluralize(2, "child", "children")).toBe("2 children");
  });
});

describe("capitalize", () => {
  it("uppercases only the first character", () => {
    expect(capitalize("hello")).toBe("Hello");
    expect(capitalize("hELLO")).toBe("HELLO");
  });
});

describe("sentenceCase", () => {
  it("uppercases the first character and lowercases the rest", () => {
    expect(sentenceCase("hELLO WORLD")).toBe("Hello world");
  });
});

describe("createModelPath", () => {
  it("creates a slugified path", () => {
    const modelPath = createModelPath("eaa9c8f-1234-5678-90ab-cdef12345678", "My Model Title!");
    const parts = modelPath.split("/");
    expect(parts[1]).toBe("models");
    expect(parts[2]).toBeTruthy();
    expect(parts[3]).toBe("eaa9c8f-1234-5678-90ab-cdef12345678");
  });

  it("slugifies the title without spaces and special characters", () => {
    const modelPath = createModelPath("id", "My Model Title!");
    const slugPart = modelPath.split("/")[2]!;
    expect(slugPart).toBe("my-model-title");
  });

  it("truncates the slug at 50 chars", () => {
    const longTitle = "a".repeat(80);
    const result = createModelPath("id", longTitle);
    const slugPart = result.split("/")[2]!;
    expect(slugPart.length).toBe(50);
  });
});

describe("parseModelPath", () => {
  it("parses a valid /models/<slug>/<id> path", () => {
    expect(parseModelPath("/models/hello-world/abc123")).toEqual({
      modelId: "abc123",
      modelSlug: "hello-world",
    });
  });

  it("returns null for non-models paths", () => {
    expect(parseModelPath("/users/foo/bar")).toBeNull();
  });

  it("returns null for paths that are too short", () => {
    expect(parseModelPath("/models/abc")).toBeNull();
  });
});

describe("appendWindowProtocol", () => {
  it("returns the URL unchanged if it already starts with http://", () => {
    expect(appendWindowProtocol("http://example.com")).toBe("http://example.com");
  });

  it("returns the URL unchanged if it already starts with https://", () => {
    expect(appendWindowProtocol("https://example.com")).toBe("https://example.com");
  });

  it("prepends a protocol when missing", () => {
    const result = appendWindowProtocol("example.com");
    expect(result).toMatch(/^https?:\/\//);
    expect(result).toContain("example.com");
  });
});

describe("formatCountdown", () => {
  it("formats minutes and seconds with pluralization", () => {
    expect(formatCountdown(0)).toBe("0 minutes 0 seconds");
    expect(formatCountdown(61)).toBe("minute second");
    expect(formatCountdown(125)).toBe("2 minutes 5 seconds");
  });
});

describe("formatBytes", () => {
  it("returns '0 Bytes' for 0", () => {
    expect(formatBytes(0)).toBe("0 Bytes");
  });

  it("formats bytes under 1KB as Bytes", () => {
    expect(formatBytes(1023)).toBe("1023 Bytes");
  });

  it("formats 1024 as 1 KB", () => {
    expect(formatBytes(1024)).toBe("1 KB");
  });

  it("formats 1MB", () => {
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
  });

  it("formats 1GB", () => {
    expect(formatBytes(1024 ** 3)).toBe("1 GB");
  });

  it("respects the decimals argument", () => {
    expect(formatBytes(1536, 0)).toBe("2 KB");
    expect(formatBytes(1536, 2)).toBe("1.5 KB");
  });
});

describe("getModelVisibilityDisplayInfo", () => {
  it("returns valid label and icon for 'public', 'private', 'unlisted' and invalid values.", () => {
    const publicInfo = getModelVisibilityDisplayInfo("public");
    const privateInfo = getModelVisibilityDisplayInfo("private");
    const unlistedInfo = getModelVisibilityDisplayInfo("unlisted");
    const fallback = getModelVisibilityDisplayInfo("invalid");

    [publicInfo, privateInfo, unlistedInfo, fallback].forEach((info) => {
      expect(info).toHaveProperty("label");
      expect(info).toHaveProperty("icon");
      expect(typeof info.label).toBe("string");
      expect(typeof info.icon).toBe("string");
    });

    const icons = new Set([publicInfo.icon, privateInfo.icon, unlistedInfo.icon, fallback.icon]);
    const labels = new Set([
      publicInfo.label,
      privateInfo.label,
      unlistedInfo.label,
      fallback.label,
    ]);
    expect(icons.size).toBe(4);
    expect(labels.size).toBe(4);
  });
});
