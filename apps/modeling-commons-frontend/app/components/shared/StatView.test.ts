import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import StatView from "./StatView.vue";

describe("StatView", () => {
  it("renders a formatted count for the default (icon) variant", async () => {
    const wrapper = await mountSuspended(StatView, {
      props: { icon: "i-lucide-thumbs-up", count: 1234 },
    });
    expect(wrapper.text()).toContain("1.2K");
  });

  it("renders small counts without abbreviation", async () => {
    const wrapper = await mountSuspended(StatView, {
      props: { icon: "i-lucide-thumbs-up", count: 7 },
    });
    expect(wrapper.text()).toContain("7");
  });

  it("renders pluralized label when asText is true and count > 1", async () => {
    const wrapper = await mountSuspended(StatView, {
      props: { icon: "i-lucide-thumbs-up", count: 3, asText: true, label: "like" },
    });
    expect(wrapper.text()).toBe("3 likes");
  });

  it("renders the singular label when asText is true and count is 1", async () => {
    const wrapper = await mountSuspended(StatView, {
      props: { icon: "i-lucide-thumbs-up", count: 1, asText: true, label: "like" },
    });
    expect(wrapper.text()).toBe("like");
  });
});
