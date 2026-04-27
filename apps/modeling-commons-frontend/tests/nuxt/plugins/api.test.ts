import { describe, expect, it, vi } from "vitest";
import apiPlugin from "~/plugins/api";
import { useApi } from "~/composables/useApi";

describe("api plugin", () => {
  it("initializes the browser client using runtime config apiBase", async () => {
    const fakeNuxt = {
      vueApp: {},
      hook: vi.fn(),
      hooks: { hook: vi.fn() },
      runWithContext: <T,>(fn: () => T) => fn(),
      provide: vi.fn(),
    } as unknown as Parameters<typeof apiPlugin>[0];

    const result = (apiPlugin as unknown as (n: typeof fakeNuxt) => unknown)(fakeNuxt);
    if (result instanceof Promise) await result;

    const client = useApi();
    expect(client).toBeTruthy();
    expect(typeof client.GET).toBe("function");
  });
});
