import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import BaseCard from "./BaseCard.vue";

describe("BaseCard", () => {
  it("renders title and description", async () => {
    const wrapper = await mountSuspended(BaseCard, {
      props: {
        title: "Hello World",
        description: "A simple description.",
      },
    });
    expect(wrapper.text()).toContain("Hello World");
    expect(wrapper.text()).toContain("A simple description.");
  });

  it("renders fallback when description is null", async () => {
    const wrapper = await mountSuspended(BaseCard, {
      props: { title: "T", description: null },
    });
    expect(wrapper.text()).toContain("No description provided.");
  });

  it("wires anchor when `to` is provided", async () => {
    const wrapper = await mountSuspended(BaseCard, {
      props: { to: "/models/abc", title: "Linkable" },
    });
    const anchor = wrapper.find("a");
    expect(anchor.exists()).toBe(true);
    expect(anchor.attributes("href")).toBe("/models/abc");
  });

  it("does not render an anchor when `to` is not set", async () => {
    const wrapper = await mountSuspended(BaseCard, {
      props: { title: "Static" },
    });
    expect(wrapper.find("a").exists()).toBe(false);
  });

  it("renders `badges` slot content", async () => {
    const wrapper = await mountSuspended(BaseCard, {
      props: { title: "T" },
      slots: {
        badges: '<span data-testid="badge-slot">badge!</span>',
      },
    });
    expect(wrapper.find('[data-testid="badge-slot"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("badge!");
  });

  it("renders `footer` slot content", async () => {
    const wrapper = await mountSuspended(BaseCard, {
      props: { title: "T" },
      slots: {
        footer: '<span data-testid="footer-slot">footer text</span>',
      },
    });
    expect(wrapper.find('[data-testid="footer-slot"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("footer text");
  });
});
