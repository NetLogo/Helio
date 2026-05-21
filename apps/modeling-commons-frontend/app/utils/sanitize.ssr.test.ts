// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sanitizeNavigationQuery, sanitizeUrl } from "./sanitize";

describe("sanitizeUrl (SSR / Node env)", () => {
  it("does not reference window for absolute http(s) URLs", () => {
    expect(typeof globalThis.window).toBe("undefined");
    expect(sanitizeUrl("https://example.com/path")).toBe(
      "https://example.com/path",
    );
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
  });

  it("accepts mailto and tel without a DOM", () => {
    expect(sanitizeUrl("mailto:a@b.com")).toBe("mailto:a@b.com");
    expect(sanitizeUrl("tel:+15551234")).toBe("tel:+15551234");
  });

  it("rejects unsafe protocols in Node env", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("");
    expect(sanitizeUrl("data:text/html,<script>")).toBe("");
    expect(sanitizeUrl("file:///etc/passwd")).toBe("");
  });

  it("returns relative URLs unchanged in Node env", () => {
    expect(sanitizeUrl("/foo/bar")).toBe("/foo/bar");
    expect(sanitizeUrl("foo/bar")).toBe("foo/bar");
  });

  it("handles protocol-relative URLs without crashing", () => {
    const result = sanitizeUrl("//evil.com/path");
    expect(result === "" || result.startsWith("http")).toBe(true);
  });
});

describe("sanitizeNavigationQuery (SSR / Node env)", () => {
  it("works without window", () => {
    expect(typeof globalThis.window).toBe("undefined");
    expect(sanitizeNavigationQuery("/models/foo")).toBe("/models/foo");
    expect(sanitizeNavigationQuery("models/foo")).toBe("/models/foo");
    expect(sanitizeNavigationQuery("https://evil.com")).toBe("");
    expect(sanitizeNavigationQuery("//evil.com/path")).toBe("");
  });
});
