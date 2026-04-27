import { computed } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import authMiddleware from "~/middleware/auth";

const { userState, navigateToMock } = vi.hoisted(() => ({
  userState: {
    current: { isLoggedIn: false } as { isLoggedIn: boolean; user?: unknown },
  },
  navigateToMock: vi.fn((target) => target),
}));

mockNuxtImport("useUser", () => () => computed(() => userState.current));

mockNuxtImport("navigateTo", () => navigateToMock);

const fakeRoute = (fullPath = "/profile/settings") =>
  ({ fullPath, path: fullPath, query: {}, params: {}, hash: "", matched: [], meta: {}, name: undefined, redirectedFrom: undefined } as never);

beforeEach(() => {
  vi.resetAllMocks();
  navigateToMock.mockImplementation((target) => target);
  userState.current = { isLoggedIn: false };
});

describe("auth middleware", () => {
  it("redirects unauthenticated users to /login with a next= query", async () => {
    const to = fakeRoute("/profile/settings");
    await (authMiddleware as unknown as (to: unknown, from: unknown) => unknown)(to, fakeRoute("/"));

    expect(navigateToMock).toHaveBeenCalledTimes(1);
    expect(navigateToMock).toHaveBeenCalledWith({
      path: "/login",
      query: { next: "/profile/settings" },
    });
  });

  it("does not redirect authenticated users", async () => {
    userState.current = { isLoggedIn: true };

    const to = fakeRoute("/profile/settings");
    const result = await (authMiddleware as unknown as (to: unknown, from: unknown) => unknown)(to, fakeRoute("/"));

    expect(navigateToMock).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
