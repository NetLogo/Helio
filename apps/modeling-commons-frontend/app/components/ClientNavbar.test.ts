import { computed } from "vue";
import { describe, expect, it, vi } from "vitest";
import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import ClientNavbar from "./ClientNavbar.vue";

const { userState } = vi.hoisted(() => ({
  userState: {
    current: {
      isLoggedIn: false,
      name: "",
      email: "",
      image: null,
      user: null,
      session: null,
    } as Record<string, unknown>,
  },
}));

mockNuxtImport("useUser", () => () => computed(() => userState.current));

mockNuxtImport("useAuthActions", () => () => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

describe("ClientNavbar (signed out)", () => {
  it("shows Log In and Sign Up links", async () => {
    userState.current = {
      isLoggedIn: false,
      name: "",
      email: "",
      image: null,
      user: null,
      session: null,
    };
    const wrapper = await mountSuspended(ClientNavbar);
    expect(wrapper.text()).toContain("Log In");
    expect(wrapper.text()).toContain("Sign Up");
  });

  it("does not show the upload button when signed out", async () => {
    userState.current = {
      isLoggedIn: false,
      name: "",
      email: "",
      image: null,
      user: null,
      session: null,
    };
    const wrapper = await mountSuspended(ClientNavbar);
    expect(wrapper.find('a[href="/models/upload"]').exists()).toBe(false);
  });
});

describe("ClientNavbar (signed in)", () => {
  it("shows the upload link and the user's name", async () => {
    userState.current = {
      isLoggedIn: true,
      name: "Ada Lovelace",
      email: "ada@example.com",
      image: null,
      user: { id: "u1", name: "Ada Lovelace" },
      session: { id: "s1" },
    };
    const wrapper = await mountSuspended(ClientNavbar);
    expect(wrapper.find('a[href="/models/upload"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Ada Lovelace");
    expect(wrapper.text()).not.toContain("Log In");
  });
});
