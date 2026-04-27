import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { makeModelListItem } from "~~/tests/helpers";
import { getVisibilityIcon } from "~/utils/formatters";
import ModelCard from "./ModelCard.vue";

describe("ModelCard", () => {
  it("renders the title", async () => {
    const model = makeModelListItem({ title: "Wolf Sheep Predation" });
    const wrapper = await mountSuspended(ModelCard, { props: { model } });
    expect(wrapper.text()).toContain("Wolf Sheep Predation");
  });

  it("falls back to 'Untitled Model' when title is empty", async () => {
    const model = makeModelListItem({ title: "" });
    const wrapper = await mountSuspended(ModelCard, { props: { model } });
    expect(wrapper.text()).toContain("Untitled Model");
  });

  it.todo("renders the visibility icon for public models — UIcon strips the i-lucide-* class from rendered HTML; assertion needs a different signal", async () => {
    const model = makeModelListItem({ visibility: "public" });
    const wrapper = await mountSuspended(ModelCard, { props: { model } });
    const expected = getVisibilityIcon("public");
    expect(wrapper.html()).toContain(expected);
  });

  it("renders the endorsed badge when isEndorsed is true", async () => {
    const model = makeModelListItem({ isEndorsed: true });
    const wrapper = await mountSuspended(ModelCard, { props: { model } });
    expect(wrapper.text()).toContain("Featured");
  });

  it("does not render the endorsed badge when isEndorsed is false", async () => {
    const model = makeModelListItem({ isEndorsed: false });
    const wrapper = await mountSuspended(ModelCard, { props: { model } });
    expect(wrapper.text()).not.toContain("Featured");
  });

  it.todo("renders the parent (fork) badge when parentModelId is set — same UIcon class-stripping issue", async () => {
    const model = makeModelListItem({ parentModelId: "parent-1" });
    const wrapper = await mountSuspended(ModelCard, { props: { model } });
    expect(wrapper.html()).toContain("i-lucide-git-branch");
  });

  it("renders a relative date in the footer", async () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const model = makeModelListItem({ createdAt: fiveDaysAgo });
    const wrapper = await mountSuspended(ModelCard, { props: { model } });
    expect(wrapper.find("time").exists()).toBe(true);
    expect(wrapper.find("time").text()).toMatch(/ago|just now/);
  });
});
