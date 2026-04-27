import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import TagList from "./TagList.vue";

describe("TagList", () => {
  it("renders each tag with sentence-cased label", async () => {
    const wrapper = await mountSuspended(TagList, {
      props: {
        tags: [
          { id: "1", name: "biology" },
          { id: "2", name: "ecology" },
        ],
      },
    });
    expect(wrapper.text()).toContain("Biology");
    expect(wrapper.text()).toContain("Ecology");
  });

  it("does not render an Add button when not editable", async () => {
    const wrapper = await mountSuspended(TagList, {
      props: { tags: [{ id: "1", name: "x" }] },
    });
    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("renders an Add button and emits `add` on click when editable", async () => {
    const wrapper = await mountSuspended(TagList, {
      props: { tags: [{ id: "1", name: "x" }], editable: true },
    });
    const button = wrapper.find("button");
    expect(button.exists()).toBe(true);
    await button.trigger("click");
    expect(wrapper.emitted("add")).toBeTruthy();
    expect(wrapper.emitted("add")).toHaveLength(1);
  });
});
