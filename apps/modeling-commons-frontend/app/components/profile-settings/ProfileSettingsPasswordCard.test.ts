import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ProfileSettingsPasswordCard from "./ProfileSettingsPasswordCard.vue";
import { authRoutes } from "~/utils/auth";

describe("ProfileSettingsPasswordCard", () => {
  it("renders the security eyebrow + 'Password' heading", async () => {
    const wrapper = await mountSuspended(ProfileSettingsPasswordCard);
    expect(wrapper.text()).toContain("Security");
    expect(wrapper.text()).toContain("Password");
  });

  it("renders a 'Reset password' call-to-action that links to the reset route", async () => {
    const wrapper = await mountSuspended(ProfileSettingsPasswordCard);
    const link = wrapper.findAll("a").find((a) => a.text().includes("Reset password"));
    expect(link).toBeTruthy();
    expect(link!.attributes("href")).toBe(authRoutes.resetPassword);
  });

  it("renders descriptive helper copy", async () => {
    const wrapper = await mountSuspended(ProfileSettingsPasswordCard);
    expect(wrapper.text()).toMatch(/rotate credentials|recover access/);
  });

  it.todo(
    "Plan called for current/new/confirm fields and an in-card changePassword submit, but the source delegates to the /reset-password page via a link. Restore once an in-place change-password form is added.",
  );
});
