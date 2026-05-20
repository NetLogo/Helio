import { computed } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import guestMiddleware from "~/middleware/guest";

const { userState, navigateToMock } = vi.hoisted(() => ({
  userState: { current: { isLoggedIn: false } as { isLoggedIn: boolean } },
  navigateToMock: vi.fn((target) => target),
}));

mockNuxtImport("useUser", () => () => computed(() => userState.current));

mockNuxtImport("navigateTo", () => navigateToMock);

const fakeRoute = (fullPath = "/login") =>
  ({ fullPath, path: fullPath, query: {}, params: {}, hash: "", matched: [], meta: {}, name: undefined, redirectedFrom: undefined } as never);

beforeEach(() => {
  vi.resetAllMocks();
  navigateToMock.mockImplementation((target) => target);
  userState.current = { isLoggedIn: false };
});

describe("guest middleware", () => {
  it("redirects authenticated users to the fallback path when there is no next param", async () => {
    userState.current = { isLoggedIn: true };
    await (guestMiddleware as unknown as (to: unknown, from: unknown) => unknown)(fakeRoute(), fakeRoute());

    expect(navigateToMock).toHaveBeenCalledWith("/");
  });

  it("honors the `next` query param when authenticated", async () => {
    userState.current = { isLoggedIn: true };
    const route = { ...fakeRoute(), query: { next: "/models" } };
    await (guestMiddleware as unknown as (to: unknown, from: unknown) => unknown)(route as never, fakeRoute());

    expect(navigateToMock).toHaveBeenCalledWith("/models");
  });

  it("does nothing for guests", async () => {
    const result = await (guestMiddleware as unknown as (to: unknown, from: unknown) => unknown)(fakeRoute(), fakeRoute());
    expect(navigateToMock).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
