import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { makeModelCard } from "~~/tests/helpers";
import { getVisibilityIcon } from "~/utils/formatters";
import ModelCard from "./ModelCard.vue";

describe("ModelCard", () => {
  it("renders the title", async () => {
    const card = makeModelCard({ title: "Wolf Sheep Predation" });
    const wrapper = await mountSuspended(ModelCard, { props: { card } });
    expect(wrapper.text()).toContain("Wolf Sheep Predation");
  });

  it("falls back to 'Untitled Model' when title is empty", async () => {
    const card = makeModelCard({ title: "" });
    const wrapper = await mountSuspended(ModelCard, { props: { card } });
    expect(wrapper.text()).toContain("Untitled Model");
  });

  it.todo(
    "renders the visibility icon for public models — UIcon strips the i-lucide-* class from rendered HTML; assertion needs a different signal",
    async () => {
      const card = makeModelCard({ visibility: "public" });
      const wrapper = await mountSuspended(ModelCard, { props: { card } });
      const expected = getVisibilityIcon("public");
      expect(wrapper.html()).toContain(expected);
    },
  );

  it("renders the endorsed badge when isEndorsed is true", async () => {
    const card = makeModelCard({ isEndorsed: true });
    const wrapper = await mountSuspended(ModelCard, { props: { card } });
    expect(wrapper.text()).toContain("Featured");
  });

  it("does not render the endorsed badge when isEndorsed is false", async () => {
    const card = makeModelCard({ isEndorsed: false });
    const wrapper = await mountSuspended(ModelCard, { props: { card } });
    expect(wrapper.text()).not.toContain("Featured");
  });

  it.todo(
    "renders the parent (fork) badge when parentModelId is set — same UIcon class-stripping issue",
    async () => {
      const card = makeModelCard({ parentModelId: "parent-1" });
      const wrapper = await mountSuspended(ModelCard, { props: { card } });
      expect(wrapper.html()).toContain("i-lucide-git-branch");
    },
  );

  it("renders a relative date in the footer", async () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const card = makeModelCard({ createdAt: fiveDaysAgo });
    const wrapper = await mountSuspended(ModelCard, { props: { card } });
    expect(wrapper.find("time").exists()).toBe(true);
    expect(wrapper.find("time").text()).toMatch(/ago|just now/);
  });
});
