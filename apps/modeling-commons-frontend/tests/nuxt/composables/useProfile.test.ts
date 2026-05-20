import { computed } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import useProfile from "~/composables/user/useProfile";

const { userState, authRefreshMock } = vi.hoisted(() => ({
  userState: {
    current: { isLoggedIn: true, user: { id: "user-1", name: "Ada" } } as
      | { isLoggedIn: true; user: Record<string, unknown> }
      | { isLoggedIn: false; user: null },
  },
  authRefreshMock: vi.fn(async () => undefined),
}));

mockNuxtImport("useUser", () => () => computed(() => userState.current));

mockNuxtImport("useNuxtApp", (original) => {
  return (...args: Parameters<typeof useNuxtApp>) => {
    const real = (original as typeof useNuxtApp)(...args);
    return new Proxy(real, {
      get(target, prop) {
        if (prop === "$auth") return { refresh: authRefreshMock };
        return Reflect.get(target, prop);
      },
    });
  };
});

beforeEach(() => {
  vi.resetAllMocks();
  userState.current = { isLoggedIn: true, user: { id: "user-1", name: "Ada" } };
});

describe("useProfile", () => {
  it("derives profile from the active session user", () => {
    const { profile } = useProfile();
    expect((profile.value as { id?: string } | undefined)?.id).toBe("user-1");
    expect((profile.value as { name?: string } | undefined)?.name).toBe("Ada");
  });

  it("calls $auth.refresh when refresh is invoked", async () => {
    const { refresh } = useProfile();
    await refresh();
    expect(authRefreshMock).toHaveBeenCalledTimes(1);
  });

  it("returns an undefined profile when there is no logged-in user", () => {
    userState.current = { isLoggedIn: false, user: null };
    const { profile } = useProfile();
    expect(profile.value).toBeFalsy();
  });
});
