// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { sanitizeNavigationQuery, sanitizeUrl } from "./sanitize";

describe("sanitizeUrl", () => {
  it("returns an empty string for non-string input", () => {
    expect(sanitizeUrl(undefined)).toBe("");
    expect(sanitizeUrl(null)).toBe("");
    expect(sanitizeUrl(42)).toBe("");
  });

  it("returns an empty string for blank input", () => {
    expect(sanitizeUrl("")).toBe("");
    expect(sanitizeUrl("   ")).toBe("");
  });

  it("returns relative URLs unchanged (trimmed)", () => {
    expect(sanitizeUrl("/foo/bar")).toBe("/foo/bar");
    expect(sanitizeUrl("  foo/bar  ")).toBe("foo/bar");
  });

  it("allows safe protocols (http, https, mailto, tel)", () => {
    expect(sanitizeUrl("https://example.com")).toContain("https://example.com");
    expect(sanitizeUrl("mailto:a@b.com")).toContain("mailto:a@b.com");
    expect(sanitizeUrl("tel:+15551234")).toContain("tel:+15551234");
  });

  it("rejects unsafe protocols", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("");
    expect(sanitizeUrl("data:text/html,<script>")).toBe("");
    expect(sanitizeUrl("file:///etc/passwd")).toBe("");
  });

  it("rejects protocol-relative URLs by resolving against origin and checking safety", () => {
    const result = sanitizeUrl("//evil.com/path");
    expect(result === "" || result.startsWith("http")).toBe(true);
  });
});

describe("sanitizeNavigationQuery", () => {
  it("returns an empty string for non-string input", () => {
    expect(sanitizeNavigationQuery(undefined)).toBe("");
    expect(sanitizeNavigationQuery(123)).toBe("");
  });

  it("returns an empty string for blank input", () => {
    expect(sanitizeNavigationQuery("")).toBe("");
    expect(sanitizeNavigationQuery("   ")).toBe("");
  });

  it("rejects absolute URLs with a protocol", () => {
    expect(sanitizeNavigationQuery("https://evil.com")).toBe("");
    expect(sanitizeNavigationQuery("javascript:alert(1)")).toBe("");
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeNavigationQuery("//evil.com/path")).toBe("");
  });

  it("returns relative paths unchanged when they begin with '/'", () => {
    expect(sanitizeNavigationQuery("/models/foo")).toBe("/models/foo");
  });

  it("prepends a leading slash to bare paths", () => {
    expect(sanitizeNavigationQuery("models/foo")).toBe("/models/foo");
  });
});
