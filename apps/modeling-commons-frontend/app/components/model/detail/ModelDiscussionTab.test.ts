import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ModelDiscussionTab from "./ModelDiscussionTab.vue";

const CommentsSectionStub = {
  name: "CommentsSection",
  props: ["modelId", "sort"],
  template: "<div data-testid='comments-section' />",
};

function mount() {
  return mountSuspended(ModelDiscussionTab, {
    props: { modelId: "model-1" },
    global: { stubs: { CommentsSection: CommentsSectionStub } },
  });
}

describe("ModelDiscussionTab", () => {
  it("renders the Discussion heading", async () => {
    const wrapper = await mount();
    expect(wrapper.text()).toContain("Discussion");
  });

  it("labels the sort control", async () => {
    const wrapper = await mount();
    expect(wrapper.text()).toContain("Sort by");
  });

  it("wires the model id and default sort into the comments section", async () => {
    const wrapper = await mount();
    const section = wrapper.getComponent(CommentsSectionStub);
    expect(section.props("modelId")).toBe("model-1");
    expect(section.props("sort")).toBe("likes");
  });
});
