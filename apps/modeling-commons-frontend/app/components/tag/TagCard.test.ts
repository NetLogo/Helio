import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import TagCard from "./TagCard.vue";

describe("TagCard", () => {
  it("renders the sentence-cased name and the description", async () => {
    const wrapper = await mountSuspended(TagCard, {
      props: { name: "biology", description: "12 models" },
    });
    expect(wrapper.text()).toContain("Biology");
    expect(wrapper.text()).toContain("12 models");
  });

  it("uses displayName verbatim when it is provided", async () => {
    const wrapper = await mountSuspended(TagCard, {
      props: { name: "biology", displayName: "Biology & Life Sciences", description: "12 models" },
    });
    expect(wrapper.text()).toContain("Biology & Life Sciences");
  });

  it.todo("renders the hash icon avatar — UIcon class-stripping in rendered HTML", async () => {
    const wrapper = await mountSuspended(TagCard, {
      props: { name: "ecology", description: "3 models" },
    });
    expect(wrapper.html()).toContain("i-lucide-hash");
  });
});
