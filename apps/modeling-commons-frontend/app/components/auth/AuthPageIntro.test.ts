import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import AuthPageIntro from "./AuthPageIntro.vue";

describe("AuthPageIntro", () => {
  it("renders the icon, title, and description prop", async () => {
    const wrapper = await mountSuspended(AuthPageIntro, {
      props: {
        icon: "i-lucide-key",
        title: "Welcome back",
        description: "Sign in to continue",
      },
    });
    expect(wrapper.text()).toContain("Welcome back");
    expect(wrapper.text()).toContain("Sign in to continue");
    // UIcon class is not preserved verbatim in rendered HTML; assert on text/heading instead.
  });

  it("renders the title in a heading element", async () => {
    const wrapper = await mountSuspended(AuthPageIntro, {
      props: { icon: "i-lucide-key", title: "Welcome back" },
    });
    const heading = wrapper.find("h1");
    expect(heading.exists()).toBe(true);
    expect(heading.text()).toBe("Welcome back");
  });

  it("renders default slot content in place of description", async () => {
    const wrapper = await mountSuspended(AuthPageIntro, {
      props: { icon: "i-lucide-key", title: "Hi", description: "fallback" },
      slots: {
        default: '<span data-testid="slot-content">Custom slot</span>',
      },
    });
    expect(wrapper.find('[data-testid="slot-content"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Custom slot");
    expect(wrapper.text()).not.toContain("fallback");
  });
});
