import { describe, expect, it, vi } from "vitest";

describe("useApi (browser path)", () => {
  it("throws if initApi has not been called", async () => {
    vi.resetModules();
    const mod = await import("~/composables/useApi");
    expect(() => mod.useApi()).toThrow(/API client not initialized/);
  });

  it("returns the same singleton client after initApi has run", async () => {
    vi.resetModules();
    const mod = await import("~/composables/useApi");
    mod.initApi("http://api.test");
    const a = mod.useApi();
    const b = mod.useApi();
    expect(a).toBe(b);
  });

  it.todo("SSR path: covered indirectly — needs a separate SSR-env test");
});
