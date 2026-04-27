import { computed } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import usePasskeyPrompt from "~/composables/usePasskeyPrompt";

const { userState, hasPasskeysRef, isPendingRef, isRefetchingRef } = vi.hoisted(() => ({
  userState: {
    current: { isLoggedIn: true, email: "ada@example.com" } as { isLoggedIn: boolean; email?: string },
  },
  hasPasskeysRef: { value: false } as { value: boolean },
  isPendingRef: { value: false } as { value: boolean },
  isRefetchingRef: { value: false } as { value: boolean },
}));

mockNuxtImport("useUser", () => () => computed(() => userState.current));

mockNuxtImport("usePasskeys", () => () => ({
  hasPasskeys: hasPasskeysRef,
  isPending: isPendingRef,
  isRefetching: isRefetchingRef,
}));

beforeEach(() => {
  vi.resetAllMocks();
  hasPasskeysRef.value = false;
  isPendingRef.value = false;
  isRefetchingRef.value = false;
  userState.current = { isLoggedIn: true, email: "ada@example.com" };
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }
});

describe("usePasskeyPrompt", () => {
  it("shouldSkipPrompt is false when no passkeys and not yet dismissed", () => {
    const prompt = usePasskeyPrompt();
    expect(prompt.dismissed.value).toBe(false);
    expect(prompt.shouldSkipPrompt.value).toBe(false);
  });

  it("dismissPrompt sets the localStorage flag and dismissed=true", () => {
    const prompt = usePasskeyPrompt();
    prompt.dismissPrompt();

    expect(prompt.dismissed.value).toBe(true);
    expect(window.localStorage.getItem("auth:passkey-prompt:dismissed:ada@example.com")).toBe("1");
  });

  it("clearPromptDismissal removes the flag", () => {
    window.localStorage.setItem("auth:passkey-prompt:dismissed:ada@example.com", "1");
    const prompt = usePasskeyPrompt();
    prompt.clearPromptDismissal();

    expect(prompt.dismissed.value).toBe(false);
    expect(window.localStorage.getItem("auth:passkey-prompt:dismissed:ada@example.com")).toBeNull();
  });
});
