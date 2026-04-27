import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ProfileSettingsCard from "./ProfileSettingsCard.vue";

describe("ProfileSettingsCard", () => {
  it("renders the title prop", async () => {
    const wrapper = await mountSuspended(ProfileSettingsCard, {
      props: { title: "Profile overview" },
    });
    expect(wrapper.text()).toContain("Profile overview");
  });

  it("renders the eyebrow and description props", async () => {
    const wrapper = await mountSuspended(ProfileSettingsCard, {
      props: {
        eyebrow: "Account",
        title: "Profile overview",
        description: "Account details on file.",
      },
    });
    expect(wrapper.text()).toContain("Account");
    expect(wrapper.text()).toContain("Account details on file.");
  });

  it("renders the default slot content", async () => {
    const wrapper = await mountSuspended(ProfileSettingsCard, {
      props: { title: "Section" },
      slots: {
        default: '<p data-testid="slot-body">slot body content</p>',
      },
    });
    expect(wrapper.find('[data-testid="slot-body"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("slot body content");
  });

  it("renders the header slot when provided", async () => {
    const wrapper = await mountSuspended(ProfileSettingsCard, {
      props: { title: "Section" },
      slots: {
        header: '<button data-testid="header-action">Action</button>',
      },
    });
    expect(wrapper.find('[data-testid="header-action"]').exists()).toBe(true);
  });

  it("hides the header section when there is no title, description, eyebrow, or header slot", async () => {
    const wrapper = await mountSuspended(ProfileSettingsCard, {
      slots: { default: "<p>body</p>" },
    });
    expect(wrapper.find("header").exists()).toBe(false);
  });
});
