import { describe, expect, it } from "vitest";
import { detectBrowser, detectPlatform, parseDeviceName } from "./parsers";

describe("parseDeviceName", () => {
  it("returns 'Unknown device' when given undefined", () => {
    expect(parseDeviceName(undefined)).toBe("Unknown device");
  });

  it("combines browser and platform when both are detected", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(parseDeviceName(ua)).toBe("Chrome on macOS");
  });

  it("returns just the platform when no browser is detected", () => {
    expect(parseDeviceName("Mozilla/5.0 (X11; Linux x86_64)")).toBe("Linux");
  });

  it("returns 'Unknown device' when neither platform nor browser matches", () => {
    expect(parseDeviceName("totally unknown UA string")).toBe("Unknown device");
  });
});

describe("detectPlatform", () => {
  it("detects iPhone, iPad, Android, macOS, Windows, and Linux", () => {
    expect(detectPlatform("iPhone; CPU iPhone OS 17_0")).toBe("iPhone");
    expect(detectPlatform("iPad; CPU OS 17_0")).toBe("iPad");
    expect(detectPlatform("Linux; Android 14")).toBe("Android");
    expect(detectPlatform("Macintosh; Intel Mac OS X 10_15_7")).toBe("macOS");
    expect(detectPlatform("Windows NT 10.0; Win64; x64")).toBe("Windows");
    expect(detectPlatform("X11; Linux x86_64")).toBe("Linux");
  });

  it("returns 'Unknown device' for unmatched strings", () => {
    expect(detectPlatform("SomeOtherOS/1.0")).toBe("Unknown device");
  });
});

describe("detectBrowser", () => {
  it("detects Edge, Opera, Firefox, Chrome, and Safari in priority order", () => {
    expect(
      detectBrowser(
        "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      ),
    ).toBe("Edge");
    expect(detectBrowser("Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0")).toBe("Opera");
    expect(detectBrowser("Mozilla/5.0 (X11; Linux) Gecko/20100101 Firefox/121.0")).toBe("Firefox");
    expect(detectBrowser("Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36")).toBe("Chrome");
    expect(
      detectBrowser(
        "Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
      ),
    ).toBe("Safari");
  });

  it("returns null for unrecognized browsers", () => {
    expect(detectBrowser("curl/8.0.0")).toBeNull();
  });
});
