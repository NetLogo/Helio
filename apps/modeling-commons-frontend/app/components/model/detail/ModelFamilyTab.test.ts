import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ModelFamilyTab from "./ModelFamilyTab.vue";
import type { FamilyModel } from "./types";

function makeFamilyModel(overrides: Partial<FamilyModel> = {}): FamilyModel {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    title: "Wolf Sheep Predation",
    description: "Classic predator-prey simulation.",
    visibility: "public",
    isEndorsed: false,
    createdAt: new Date("2026-01-15T00:00:00Z").toISOString(),
    latestVersionNumber: 1,
    parentModelId: null,
    parentVersionNumber: null,
    authorName: "Ada Lovelace",
    versionCount: 3,
    linkedVersionNumber: null,
    ...overrides,
  };
}

describe("ModelFamilyTab", () => {
  it("renders the empty state when there is no parent and no children", async () => {
    const wrapper = await mountSuspended(ModelFamilyTab, {
      props: { parent: null, children: [] },
    });
    expect(wrapper.text()).toContain("No family connections");
  });

  it("renders the parent model when one is provided", async () => {
    const parent = makeFamilyModel({
      id: "00000000-0000-0000-0000-000000000010",
      title: "Predator-Prey Base",
      authorName: "Grace Hopper",
    });
    const wrapper = await mountSuspended(ModelFamilyTab, {
      props: { parent, children: [] },
    });
    expect(wrapper.text()).toContain("Forked from");
    expect(wrapper.text()).toContain("Predator-Prey Base");
    expect(wrapper.text()).toContain("Grace Hopper");
  });

  it("renders the children section with a count badge and one card per child", async () => {
    const children = [
      makeFamilyModel({ id: "00000000-0000-0000-0000-0000000000c1", title: "Child Alpha" }),
      makeFamilyModel({ id: "00000000-0000-0000-0000-0000000000c2", title: "Child Beta" }),
    ];
    const wrapper = await mountSuspended(ModelFamilyTab, {
      props: { parent: null, children },
    });
    expect(wrapper.text()).toContain("Children (2)");
    expect(wrapper.text()).toContain("Child Alpha");
    expect(wrapper.text()).toContain("Child Beta");
  });

  it("collapses the children list when the toggle button is clicked", async () => {
    const children = [makeFamilyModel({ title: "Child Alpha" })];
    const wrapper = await mountSuspended(ModelFamilyTab, {
      props: { parent: null, children },
    });
    expect(wrapper.text()).toContain("Child Alpha");
    const toggle = wrapper.findAll("button").find((b) => b.text().includes("Children"));
    expect(toggle).toBeTruthy();
    await toggle!.trigger("click");
    expect(wrapper.text()).not.toContain("Child Alpha");
  });
});
