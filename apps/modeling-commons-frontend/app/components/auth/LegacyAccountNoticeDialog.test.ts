import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed } from "vue";
import LegacyAccountNoticeDialog from "./LegacyAccountNoticeDialog.vue";
import {
  legacyAccountNoticeDismissalKey,
  legacyAccountNoticeSunsetDate,
} from "~/composables/auth/useLegacyAccountNotice";

const { userState } = vi.hoisted(() => ({
  userState: { current: { isLoggedIn: false } as { isLoggedIn: boolean } },
}));

mockNuxtImport("useUser", () => () => computed(() => userState.current));

const noticeTitle = "Old accounts are not lost";
const dismissLabel = "I didn't have an old account";

function renderedText() {
  return document.body.textContent ?? "";
}

beforeEach(() => {
  userState.current = { isLoggedIn: false };
  window.localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-08-11T10:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("LegacyAccountNoticeDialog", () => {
  it("opens for a signed-out visitor before the sunset date", async () => {
    await mountSuspended(LegacyAccountNoticeDialog);

    expect(renderedText()).toContain(noticeTitle);
  });

  it("stays closed on the sunset date", async () => {
    vi.setSystemTime(new Date(`${legacyAccountNoticeSunsetDate}T00:00:00`));

    await mountSuspended(LegacyAccountNoticeDialog);

    expect(renderedText()).not.toContain(noticeTitle);
  });

  it("stays closed after the sunset date", async () => {
    vi.setSystemTime(new Date("2027-01-05T10:00:00"));

    await mountSuspended(LegacyAccountNoticeDialog);

    expect(renderedText()).not.toContain(noticeTitle);
  });

  it("stays closed once it has been dismissed", async () => {
    window.localStorage.setItem(legacyAccountNoticeDismissalKey, "1");

    await mountSuspended(LegacyAccountNoticeDialog);

    expect(renderedText()).not.toContain(noticeTitle);
  });

  it("stays closed for a signed-in user", async () => {
    userState.current = { isLoggedIn: true };

    await mountSuspended(LegacyAccountNoticeDialog);

    expect(renderedText()).not.toContain(noticeTitle);
  });

  it("persists the dismissal and closes when the visitor dismisses it", async () => {
    const wrapper = await mountSuspended(LegacyAccountNoticeDialog);

    const dismissButton = document
      .querySelectorAll("button")
      .values()
      .find((button) => button.textContent?.includes(dismissLabel));

    expect(dismissButton).toBeDefined();
    dismissButton!.click();
    await wrapper.vm.$nextTick();

    expect(window.localStorage.getItem(legacyAccountNoticeDismissalKey)).toBe("1");
    expect(document.querySelector('[role="dialog"][data-state="open"]')).toBeNull();
  });

  it("points the primary action at the reset-password route with the next path", async () => {
    await mountSuspended(LegacyAccountNoticeDialog, { props: { next: "/models/foo bar" } });

    const link = document.querySelector<HTMLAnchorElement>('a[href*="reset-password"]');

    expect(link?.getAttribute("href")).toBe(getResetPasswordLink("/models/foo bar"));
  });
});
