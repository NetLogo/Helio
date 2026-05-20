import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import TagChip from "./TagChip.vue";

describe("TagChip", () => {
  it("prefers displayName over name for the label", async () => {
    const wrapper = await mountSuspended(TagChip, {
      props: { name: "biology", displayName: "Biology & Life Sciences" },
    });
    expect(wrapper.text()).toContain("Biology & Life Sciences");
  });

  it("falls back to a sentence-cased name when displayName is missing", async () => {
    const wrapper = await mountSuspended(TagChip, {
      props: { name: "ecology" },
    });
    expect(wrapper.text()).toContain("Ecology");
  });

  it("renders as a link to the tag page by name", async () => {
    const wrapper = await mountSuspended(TagChip, {
      props: { name: "biology" },
    });
    const link = wrapper.find("a");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe("/tags/biology");
  });

  it("renders as a plain span when linkable is false", async () => {
    const wrapper = await mountSuspended(TagChip, {
      props: { name: "biology", linkable: false },
    });
    expect(wrapper.find("a").exists()).toBe(false);
    expect(wrapper.find("span").exists()).toBe(true);
  });
});
