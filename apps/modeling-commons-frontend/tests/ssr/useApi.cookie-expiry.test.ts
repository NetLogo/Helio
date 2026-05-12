import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.stubGlobal("useRuntimeConfig", () => ({
    public: { apiBase: "http://server.test" },
  }));
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useApi cookie/session edge cases", () => {
  it("does not throw when cookie header is an empty string and skips the cookie header", async () => {
    vi.stubGlobal("useRequestHeaders", () => ({ cookie: "" }));

    const { useApi } = await import("~/composables/api/useApi");

    expect(() => useApi()).not.toThrow();
  });

  it("does not throw when cookie header is missing entirely", async () => {
    vi.stubGlobal("useRequestHeaders", () => ({}));

    const { useApi } = await import("~/composables/api/useApi");

    expect(() => useApi()).not.toThrow();
  });

  it("constructs a transport-level client even when cookie carries an expired session token", async () => {
    vi.stubGlobal("useRequestHeaders", (keys: string[]) =>
      keys.includes("cookie")
        ? { cookie: "sid=expired-token-abc; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT" }
        : {},
    );

    const { useApi } = await import("~/composables/api/useApi");

    expect(() => useApi()).not.toThrow();
    const client = useApi();
    expect(typeof client.GET).toBe("function");
  });
});
