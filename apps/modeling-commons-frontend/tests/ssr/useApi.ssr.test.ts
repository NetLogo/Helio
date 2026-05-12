import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.stubGlobal("useRuntimeConfig", () => ({
    public: { apiBase: "http://server.test" },
  }));
  vi.stubGlobal("useRequestHeaders", (keys: string[]) =>
    keys.includes("cookie") ? { cookie: "sid=abc" } : {},
  );
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useApi (SSR path)", () => {
  it("returns a client with GET/POST/PATCH/DELETE/PUT methods", async () => {
    const { useApi } = await import("~/composables/api/useApi");
    const client = useApi();

    expect(typeof client.GET).toBe("function");
    expect(typeof client.POST).toBe("function");
    expect(typeof client.PATCH).toBe("function");
    expect(typeof client.DELETE).toBe("function");
    expect(typeof client.PUT).toBe("function");
  });

  it("creates a fresh client per call (no shared server state)", async () => {
    const { useApi } = await import("~/composables/api/useApi");
    const a = useApi();
    const b = useApi();

    expect(a).not.toBe(b);
  });

  it("forwards the cookie header when provided by useRequestHeaders", async () => {
    const headersSpy = vi.fn((keys: string[]) =>
      keys.includes("cookie") ? { cookie: "sid=abc" } : {},
    );
    vi.stubGlobal("useRequestHeaders", headersSpy);

    const { useApi } = await import("~/composables/api/useApi");
    const client = useApi();

    expect(headersSpy).toHaveBeenCalledWith(["cookie"]);
    expect(client).toBeDefined();
  });

  it("still constructs when useRequestHeaders returns no cookie", async () => {
    vi.stubGlobal("useRequestHeaders", () => ({}));

    const { useApi } = await import("~/composables/api/useApi");

    expect(() => useApi()).not.toThrow();
    const client = useApi();
    expect(typeof client.GET).toBe("function");
  });

  it("initApi is a no-op on the server; subsequent useApi() still uses the SSR per-call path", async () => {
    const mod = await import("~/composables/api/useApi");

    mod.initApi("http://should-not-be-used.test");

    const a = mod.useApi();
    const b = mod.useApi();
    expect(a).not.toBe(b);
    expect(typeof a.GET).toBe("function");
  });
});
