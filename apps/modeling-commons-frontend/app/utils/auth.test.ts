import { describe, expect, it } from "vitest";
import {
  authRoutes,
  getEmailVerificationCallbackUrl,
  getPasskeyPromptUrl,
  getResetPasswordRedirectUrl,
  getSafeNextPath,
} from "./auth";

describe("getSafeNextPath", () => {
  it("accepts a normal absolute path", () => {
    expect(getSafeNextPath("/foo/bar")).toBe("/foo/bar");
  });

  it("rejects protocol-relative URLs starting with //", () => {
    expect(getSafeNextPath("//evil.com/path")).toBe(authRoutes.models);
  });

  it("rejects non-string inputs", () => {
    expect(getSafeNextPath(undefined)).toBe(authRoutes.models);
    expect(getSafeNextPath(null)).toBe(authRoutes.models);
    expect(getSafeNextPath(123)).toBe(authRoutes.models);
  });

  it("rejects strings that don't start with /", () => {
    expect(getSafeNextPath("foo")).toBe(authRoutes.models);
    expect(getSafeNextPath("https://evil.com")).toBe(authRoutes.models);
  });

  it("uses a custom fallback when provided", () => {
    expect(getSafeNextPath(null, "/custom-fallback")).toBe("/custom-fallback");
  });
});

describe("getEmailVerificationCallbackUrl", () => {
  it("appends verified=1 and a valid next param", () => {
    const url = new URL(getEmailVerificationCallbackUrl("http://app.test", "/models/abc"));
    expect(url.origin).toBe("http://app.test");
    expect(url.pathname).toBe(authRoutes.login);
    expect(url.searchParams.get("verified")).toBe("1");
    expect(url.searchParams.get("next")).toBe("/models/abc");
  });

  it("omits next when the path is unsafe", () => {
    const url = new URL(getEmailVerificationCallbackUrl("http://app.test", "//evil.com"));
    expect(url.searchParams.get("verified")).toBe("1");
    expect(url.searchParams.get("next")).toBeNull();
  });

  it("omits next when not provided", () => {
    const url = new URL(getEmailVerificationCallbackUrl("http://app.test"));
    expect(url.searchParams.get("verified")).toBe("1");
    expect(url.searchParams.get("next")).toBeNull();
  });
});

describe("getResetPasswordRedirectUrl", () => {
  it("returns the absolute reset-password URL", () => {
    const url = new URL(getResetPasswordRedirectUrl("http://app.test"));
    expect(url.origin).toBe("http://app.test");
    expect(url.pathname).toBe(authRoutes.resetPassword);
  });
});

describe("getPasskeyPromptUrl", () => {
  it("URL-encodes the next path", () => {
    const result = getPasskeyPromptUrl("/models/foo bar");
    expect(result).toBe(`${authRoutes.passkey}?next=${encodeURIComponent("/models/foo bar")}`);
  });

  it("falls back to the default safe path for invalid next values", () => {
    expect(getPasskeyPromptUrl("//evil")).toBe(
      `${authRoutes.passkey}?next=${encodeURIComponent(authRoutes.models)}`,
    );
  });
});
