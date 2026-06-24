import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ModelDiscussionTab from "./ModelDiscussionTab.vue";

describe("ModelDiscussionTab", () => {
  it("renders the Discussion heading", async () => {
    const wrapper = await mountSuspended(ModelDiscussionTab);
    expect(wrapper.text()).toContain("Discussion");
  });

  it("renders the empty state copy", async () => {
    const wrapper = await mountSuspended(ModelDiscussionTab);
    expect(wrapper.text()).toContain("Discussions are coming soon!");
    expect(wrapper.text()).toContain("please reach out to the author");
  });

  it("renders a filter selector", async () => {
    const wrapper = await mountSuspended(ModelDiscussionTab);
    expect(wrapper.text()).toContain("Filter by");
  });
});
