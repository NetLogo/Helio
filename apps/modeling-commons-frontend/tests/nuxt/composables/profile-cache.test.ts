import { computed, nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import useProfile from "~/composables/user/useProfile";
import useProfileSettings from "~/composables/user/useProfileSettings";
import { makeApiClientMock, apiResult } from "~~/tests/helpers/mockApi";

const { apiState, userState } = vi.hoisted(() => ({
  apiState: { current: null as ReturnType<typeof makeApiClientMock> | null },
  userState: {
    current: { isLoggedIn: true, user: { id: "user-1" } } as
      | { isLoggedIn: true; user: { id: string } }
      | { isLoggedIn: false; user: null },
  },
}));

mockNuxtImport("useApi", () => () => apiState.current!.client);

mockNuxtImport("useUser", () => () => computed(() => userState.current));

beforeEach(async () => {
  vi.resetAllMocks();
  apiState.current = makeApiClientMock();
  apiState.current.GET.mockResolvedValue(
    apiResult.ok({
      id: "user-1",
      name: "Ada",
      email: "ada@example.com",
      emailVerified: true,
      image: null,
      systemRole: "user",
      userKind: "student",
      isProfilePublic: false,
    }),
  );
  userState.current = { isLoggedIn: true, user: { id: "user-1" } };
  await clearNuxtData("profile");
});

describe("useAsyncData('profile') cache sharing", () => {
  it("useProfile() and useProfileSettings() resolve the same 'profile' async data key", async () => {
    const a = useProfile();
    await a.refresh();
    await nextTick();

    const settings = useProfileSettings();
    await nextTick();

    expect(apiState.current!.GET).toHaveBeenCalledWith(
      "/api/v1/users/{id}",
      { params: { path: { id: "user-1" } } },
    );
    expect(settings.profile.value).toBeTruthy();
    expect(a.profile.value).toBe(settings.profile.value);
  });

  it.todo("only one GET fires across useProfile() + useProfileSettings() — useAsyncData instance reuse in test env still triggers a second fetch (same root cause as useProfile/useProfileSettings it.todos)");

  it.todo("changing the user id and clearing the profile cache triggers a fresh GET — useAsyncData instance state in test env retains the prior key resolution");
});
