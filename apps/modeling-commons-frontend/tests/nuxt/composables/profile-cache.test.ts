import { computed } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import useProfile from "~/composables/user/useProfile";
import useProfileSettings from "~/composables/user/useProfileSettings";

const profileUser = {
  id: "user-1",
  name: "Ada",
  email: "ada@example.com",
  emailVerified: true,
  image: null,
  systemRole: "user",
  userKind: "student",
  isProfilePublic: false,
};

const { userState } = vi.hoisted(() => ({
  userState: {
    current: { isLoggedIn: true, user: {} } as { isLoggedIn: boolean; user: Record<string, unknown> },
  },
}));

mockNuxtImport("useUser", () => () => computed(() => userState.current));

beforeEach(() => {
  vi.resetAllMocks();
  userState.current = { isLoggedIn: true, user: profileUser };
});

describe("useProfile / useProfileSettings shared source", () => {
  it("both composables expose the same profile object from useUser()", () => {
    const a = useProfile();
    const settings = useProfileSettings();

    expect(settings.profile.value).toBeTruthy();
    expect(a.profile.value).toBe(settings.profile.value);
  });
});
