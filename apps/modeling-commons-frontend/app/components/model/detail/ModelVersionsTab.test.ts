import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import type { ModelVersion } from "~/composables/model/useModelVersions";
import ModelVersionsTab from "./ModelVersionsTab.vue";

function makeVersion(overrides: Partial<ModelVersion> = {}): ModelVersion {
  return {
    versionNumber: 1,
    title: "Initial release",
    description: "First public version",
    createdAt: new Date("2026-04-01T00:00:00Z").toISOString(),
    isFinalized: true,
    ...(overrides as Partial<ModelVersion>),
  } as ModelVersion;
}

describe("ModelVersionsTab", () => {
  it("renders the loading skeleton while pending", async () => {
    const wrapper = await mountSuspended(ModelVersionsTab, {
      props: { modelId: "model-1", versions: [], pending: true },
    });
    expect(wrapper.findAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders an empty message when the version list is empty and not pending", async () => {
    const wrapper = await mountSuspended(ModelVersionsTab, {
      props: { modelId: "model-1", versions: [], pending: false },
    });
    expect(wrapper.text()).toContain("No versions available");
  });

  it("renders one row per version", async () => {
    const versions = [
      makeVersion({ versionNumber: 1, title: "Initial" }),
      makeVersion({ versionNumber: 2, title: "Refined" }),
      makeVersion({ versionNumber: 3, title: "Stable" }),
    ];
    const wrapper = await mountSuspended(ModelVersionsTab, {
      props: { modelId: "model-1", versions, pending: false },
    });
    expect(wrapper.text()).toContain("V1");
    expect(wrapper.text()).toContain("V2");
    expect(wrapper.text()).toContain("V3");
    expect(wrapper.text()).toContain("Initial");
    expect(wrapper.text()).toContain("Refined");
    expect(wrapper.text()).toContain("Stable");
  });

  it("disables the Compare Selected button until two versions are selected", async () => {
    const versions = [makeVersion({ versionNumber: 1 }), makeVersion({ versionNumber: 2 })];
    const wrapper = await mountSuspended(ModelVersionsTab, {
      props: { modelId: "model-1", versions, pending: false },
    });
    const compareBtn = wrapper.findAll("button").find((b) => b.text().includes("Compare Selected"));
    expect(compareBtn).toBeTruthy();
    expect(compareBtn!.attributes("disabled")).toBeDefined();

    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    await checkboxes[0]!.trigger("change");
    await checkboxes[1]!.trigger("change");

    expect(compareBtn!.attributes("disabled")).toBeUndefined();
  });

  it("emits compare with the two selected version numbers", async () => {
    const versions = [makeVersion({ versionNumber: 1 }), makeVersion({ versionNumber: 2 })];
    const wrapper = await mountSuspended(ModelVersionsTab, {
      props: { modelId: "model-1", versions, pending: false },
    });
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    await checkboxes[0]!.trigger("change");
    await checkboxes[1]!.trigger("change");

    const compareBtn = wrapper.findAll("button").find((b) => b.text().includes("Compare Selected"));
    await compareBtn!.trigger("click");

    const emitted = wrapper.emitted("compare");
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]).toEqual([1, 2]);
  });
});
