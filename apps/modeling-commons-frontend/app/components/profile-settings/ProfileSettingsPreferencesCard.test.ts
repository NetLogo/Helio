import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ProfileSettingsPreferencesCard from "./ProfileSettingsPreferencesCard.vue";

const userKindOptions = [
  { label: "Student", value: "student" },
  { label: "Teacher", value: "teacher" },
  { label: "Researcher", value: "researcher" },
  { label: "Other", value: "other" },
];

const baseProps = {
  isProfilePublic: false,
  userKind: "other" as const,
  userKindOptions,
  isDirty: false,
  isSaving: false,
  visibilityLabel: "Hidden",
  visibilityBadgeColor: "neutral" as const,
};

describe("ProfileSettingsPreferencesCard", () => {
  it("renders the section title and visibility label badge", async () => {
    const wrapper = await mountSuspended(ProfileSettingsPreferencesCard, {
      props: baseProps,
    });
    expect(wrapper.text()).toContain("Profile visibility");
    expect(wrapper.text()).toContain("Hidden");
  });

  it("renders 'up to date' copy when the form is clean", async () => {
    const wrapper = await mountSuspended(ProfileSettingsPreferencesCard, {
      props: baseProps,
    });
    expect(wrapper.text()).toContain("Your profile settings are up to date.");
  });

  it("renders 'unsaved changes' copy when isDirty is true", async () => {
    const wrapper = await mountSuspended(ProfileSettingsPreferencesCard, {
      props: { ...baseProps, isDirty: true },
    });
    expect(wrapper.text()).toContain("You have unsaved changes.");
  });

  it("disables Save when there are no dirty changes", async () => {
    const wrapper = await mountSuspended(ProfileSettingsPreferencesCard, {
      props: baseProps,
    });
    const saveBtn = wrapper.findAll("button").find((b) => b.text().includes("Save"));
    expect(saveBtn).toBeTruthy();
    expect(saveBtn!.attributes("disabled")).toBeDefined();
  });

  it("emits 'save' when the Save button is clicked while dirty", async () => {
    const wrapper = await mountSuspended(ProfileSettingsPreferencesCard, {
      props: { ...baseProps, isDirty: true },
    });
    const saveBtn = wrapper.findAll("button").find((b) => b.text().includes("Save"));
    expect(saveBtn).toBeTruthy();
    await saveBtn!.trigger("click");

    expect(wrapper.emitted("save")).toBeTruthy();
  });

  it("emits 'reset' when the Reset button is clicked while dirty", async () => {
    const wrapper = await mountSuspended(ProfileSettingsPreferencesCard, {
      props: { ...baseProps, isDirty: true },
    });
    const resetBtn = wrapper.findAll("button").find((b) => b.text().includes("Reset"));
    expect(resetBtn).toBeTruthy();
    await resetBtn!.trigger("click");

    expect(wrapper.emitted("reset")).toBeTruthy();
  });

  it("emits update:isProfilePublic when the public-profile switch toggles", async () => {
    const wrapper = await mountSuspended(ProfileSettingsPreferencesCard, {
      props: baseProps,
    });
    const toggle = wrapper.find('button[role="switch"]');
    expect(toggle.exists()).toBe(true);
    await toggle.trigger("click");

    expect(wrapper.emitted("update:isProfilePublic")).toBeTruthy();
  });

  it("renders the user-kind radio options", async () => {
    const wrapper = await mountSuspended(ProfileSettingsPreferencesCard, {
      props: baseProps,
    });
    expect(wrapper.text()).toContain("Student");
    expect(wrapper.text()).toContain("Teacher");
    expect(wrapper.text()).toContain("Researcher");
    expect(wrapper.text()).toContain("Other");
  });
});
