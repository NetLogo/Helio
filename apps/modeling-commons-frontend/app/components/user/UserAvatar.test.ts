import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import UserAvatar from "./UserAvatar.vue";

describe("UserAvatar", () => {
  it("renders the user's name in the default variant", async () => {
    const wrapper = await mountSuspended(UserAvatar, {
      props: { name: "Ada Lovelace" },
    });
    expect(wrapper.text()).toContain("Ada Lovelace");
    expect(wrapper.find('[data-variant="default"]').exists()).toBe(true);
  });

  it("renders name and email in the headline variant", async () => {
    const wrapper = await mountSuspended(UserAvatar, {
      props: { name: "Ada Lovelace", email: "ada@example.com", variant: "headline" },
    });
    expect(wrapper.text()).toContain("Ada Lovelace");
    expect(wrapper.text()).toContain("ada@example.com");
    expect(wrapper.find('[data-variant="headline"]').exists()).toBe(true);
  });

  it("renders only the avatar in the compact variant with no visible name", async () => {
    const wrapper = await mountSuspended(UserAvatar, {
      props: { name: "Ada Lovelace", variant: "compact" },
    });
    expect(wrapper.find('[data-variant="compact"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Ada Lovelace");
  });

  it("renders the compact variant marker even without a name in the visible text", async () => {
    const wrapper = await mountSuspended(UserAvatar, {
      props: { name: "Ada", variant: "compact" },
    });
    expect(wrapper.find('[data-variant="compact"]').exists()).toBe(true);
  });

  it("uses 'User' as the default name when none is provided", async () => {
    const wrapper = await mountSuspended(UserAvatar, {
      props: {},
    });
    expect(wrapper.text()).toContain("User");
  });
});
