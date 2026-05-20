import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";

function stubAutoImports(dataRef: ReturnType<typeof ref>) {
  vi.stubGlobal("useNuxtApp", () => ({
    $auth: { session: { data: dataRef } },
  }));
  vi.stubGlobal("computed", computed);
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useUser SSR/browser parity", () => {
  it("returns logged-in shape when session has user data", async () => {
    const dataRef = ref({
      user: { id: "u-1", name: "Ada" },
      session: { id: "sess-1" },
    });
    stubAutoImports(dataRef);

    const mod = await import("~/composables/user/useUser");
    const result = mod.default().value;

    expect(result.isLoggedIn).toBe(true);
    expect(result.user).toEqual({ id: "u-1", name: "Ada" });
    expect(result.session).toEqual({ id: "sess-1" });
    expect(mod.isLoggedIn(result)).toBe(true);
  });

  it("returns logged-out shape when session has no user data", async () => {
    const dataRef = ref(null);
    stubAutoImports(dataRef);

    const mod = await import("~/composables/user/useUser");
    const result = mod.default().value;

    expect(result.isLoggedIn).toBe(false);
    expect(result.user).toBeNull();
    expect(result.session).toBeNull();
    expect(mod.isLoggedIn(result)).toBe(false);
  });

  it("returns logged-out shape when session data is undefined", async () => {
    const dataRef = ref(undefined);
    stubAutoImports(dataRef);

    const mod = await import("~/composables/user/useUser");
    const result = mod.default().value;

    expect(result.isLoggedIn).toBe(false);
    expect(result.user).toBeNull();
    expect(result.session).toBeNull();
  });

  it("shape is stable across two computed reads (parity invariant for SSR vs client)", async () => {
    const dataRef = ref({
      user: { id: "u-2", name: "Grace" },
      session: { id: "sess-2" },
    });
    stubAutoImports(dataRef);

    const mod = await import("~/composables/user/useUser");
    const userA = mod.default().value;
    const userB = mod.default().value;

    expect(Object.keys(userA).sort()).toEqual(Object.keys(userB).sort());
    expect(userA.isLoggedIn).toBe(userB.isLoggedIn);
    expect(userA.user).toEqual(userB.user);
  });
});
