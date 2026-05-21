import { describe, expect, it } from "vitest";
import {
  getCdnUrl,
  getConnectSrcAllowlist,
  getImageDomains,
  getImgSrcAllowlist,
} from "./runtime-image";

describe("getCdnUrl", () => {
  it("returns the CDN URL from env", () => {
    expect(getCdnUrl({ NUXT_PUBLIC_CDN_URL: "https://cdn.example.com" })).toBe(
      "https://cdn.example.com",
    );
  });
  it("returns empty string when unset", () => {
    expect(getCdnUrl({})).toBe("");
  });
});

describe("getImageDomains", () => {
  it("includes the CDN origin when present", () => {
    const domains = getImageDomains({
      NUXT_PUBLIC_CDN_URL: "https://cdn.example.com/assets",
      NUXT_PUBLIC_APP_URL: "http://app.example.com",
    });
    expect(domains).toContain("https://cdn.example.com");
    expect(domains).toContain("http://app.example.com");
  });

  it("deduplicates origins", () => {
    const domains = getImageDomains({
      NUXT_PUBLIC_CDN_URL: "https://cdn.example.com/a",
      NUXT_STORAGE_BASE_URL: "https://cdn.example.com/b",
    });
    expect(domains.filter((d) => d === "https://cdn.example.com")).toHaveLength(1);
  });

  it("drops malformed and empty entries", () => {
    const domains = getImageDomains({
      NUXT_PUBLIC_CDN_URL: "",
      NUXT_PUBLIC_APP_URL: "not a url",
    });
    expect(domains).toEqual([]);
  });
});

describe("getImgSrcAllowlist", () => {
  it("always includes self/data/blob and any configured origins", () => {
    const list = getImgSrcAllowlist({ NUXT_PUBLIC_CDN_URL: "https://cdn.example.com" });
    expect(list).toEqual(
      expect.arrayContaining(["'self'", "data:", "blob:", "https://cdn.example.com"]),
    );
  });
});

describe("getConnectSrcAllowlist", () => {
  it("includes self plus configured API/CDN origins", () => {
    const list = getConnectSrcAllowlist({
      NUXT_PUBLIC_CDN_URL: "https://cdn.example.com",
      NUXT_PUBLIC_API_BASE: "https://api.example.com",
      NUXT_PUBLIC_AUTH_BASE: "https://api.example.com/auth",
    });
    expect(list).toContain("'self'");
    expect(list).toContain("https://cdn.example.com");
    expect(list).toContain("https://api.example.com");
    expect(list.filter((o) => o === "https://api.example.com")).toHaveLength(1);
  });
});
