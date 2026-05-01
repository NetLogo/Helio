import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import TagCard from "./TagCard.vue";

describe("TagCard", () => {
  it("renders name and description", async () => {
    const wrapper = await mountSuspended(TagCard, {
      props: { name: "biology", description: "12 models" },
    });
    expect(wrapper.text()).toContain("biology");
    expect(wrapper.text()).toContain("12 models");
  });

  it.todo("renders the hash icon avatar — UIcon class-stripping in rendered HTML", async () => {
    const wrapper = await mountSuspended(TagCard, {
      props: { name: "ecology", description: "3 models" },
    });
    expect(wrapper.html()).toContain("i-lucide-hash");
  });
});
