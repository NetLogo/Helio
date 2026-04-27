import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ProfileSettingsAccountCard from "./ProfileSettingsAccountCard.vue";

const baseProps = {
  createdAt: new Date("2026-01-15T00:00:00Z").toISOString(),
  displayName: "Ada Lovelace",
  displayEmail: "ada@example.com",
  emailVerified: true,
  systemRoleLabel: "User",
};

describe("ProfileSettingsAccountCard", () => {
  it("renders the display name", async () => {
    const wrapper = await mountSuspended(ProfileSettingsAccountCard, {
      props: baseProps,
    });
    expect(wrapper.text()).toContain("Ada Lovelace");
  });

  it("renders the display email", async () => {
    const wrapper = await mountSuspended(ProfileSettingsAccountCard, {
      props: baseProps,
    });
    expect(wrapper.text()).toContain("ada@example.com");
  });

  it("renders the system role label", async () => {
    const wrapper = await mountSuspended(ProfileSettingsAccountCard, {
      props: baseProps,
    });
    expect(wrapper.text()).toContain("User");
  });

  it("renders a verified badge when emailVerified is true", async () => {
    const wrapper = await mountSuspended(ProfileSettingsAccountCard, {
      props: { ...baseProps, emailVerified: true },
    });
    expect(wrapper.text()).toContain("Verified");
    expect(wrapper.text()).not.toContain("Verification pending");
  });

  it("renders 'Verification pending' when emailVerified is false", async () => {
    const wrapper = await mountSuspended(ProfileSettingsAccountCard, {
      props: { ...baseProps, emailVerified: false },
    });
    expect(wrapper.text()).toContain("Verification pending");
  });

  it("renders the 'Member since' label", async () => {
    const wrapper = await mountSuspended(ProfileSettingsAccountCard, {
      props: baseProps,
    });
    expect(wrapper.text()).toContain("Member since");
  });

  it.todo(
    "Plan called for editable name + email update calls into useProfileSettings, but the current source is read-only ('Name editing is not available in this app yet'). Restore this test once the form fields land.",
  );

  it.todo(
    "Plan called for an error toast on rejected save, but the card has no save submission. Test belongs on whichever component owns the form.",
  );
});
