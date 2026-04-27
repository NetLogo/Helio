import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import FamilyCard from "./FamilyCard.vue";
import type { FamilyModel } from "./types";

function makeFamilyModel(overrides: Partial<FamilyModel> = {}): FamilyModel {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    title: "Wolf Sheep Predation",
    description: "Classic predator-prey simulation.",
    visibility: "public",
    isEndorsed: false,
    createdAt: new Date("2026-01-15T00:00:00Z").toISOString(),
    latestVersionNumber: 2,
    parentModelId: null,
    parentVersionNumber: null,
    authorName: "Ada Lovelace",
    versionCount: 3,
    linkedVersionNumber: null,
    ...overrides,
  };
}

describe("FamilyCard", () => {
  it("renders the model title, description, and author", async () => {
    const wrapper = await mountSuspended(FamilyCard, {
      props: { model: makeFamilyModel() },
    });
    const text = wrapper.text();
    expect(text).toContain("Wolf Sheep Predation");
    expect(text).toContain("Classic predator-prey simulation.");
    expect(text).toContain("Ada Lovelace");
  });

  it("links to the model detail page", async () => {
    const model = makeFamilyModel({ id: "abc-123" });
    const wrapper = await mountSuspended(FamilyCard, { props: { model } });
    const anchor = wrapper.find("a");
    expect(anchor.attributes("href")).toContain("/models/abc-123");
  });

  it("shows the linked version badge when linkedVersionNumber is set", async () => {
    const wrapper = await mountSuspended(FamilyCard, {
      props: { model: makeFamilyModel({ linkedVersionNumber: 4 }) },
    });
    expect(wrapper.text()).toContain("V4");
  });

  it("hides the linked version badge when linkedVersionNumber is null", async () => {
    const wrapper = await mountSuspended(FamilyCard, {
      props: { model: makeFamilyModel({ linkedVersionNumber: null }) },
    });
    expect(wrapper.text()).not.toMatch(/\bV\d+\b/);
  });

  it("shows the Endorsed badge when isEndorsed is true", async () => {
    const wrapper = await mountSuspended(FamilyCard, {
      props: { model: makeFamilyModel({ isEndorsed: true }) },
    });
    expect(wrapper.text()).toContain("Endorsed");
  });

  it("renders the visibility label", async () => {
    const wrapper = await mountSuspended(FamilyCard, {
      props: { model: makeFamilyModel({ visibility: "private" }) },
    });
    expect(wrapper.text()).toContain("private");
  });

  it("pluralizes the version count correctly", async () => {
    const single = await mountSuspended(FamilyCard, {
      props: { model: makeFamilyModel({ versionCount: 1 }) },
    });
    expect(single.text()).toContain("1 version");
    expect(single.text()).not.toContain("1 versions");

    const multiple = await mountSuspended(FamilyCard, {
      props: { model: makeFamilyModel({ versionCount: 5 }) },
    });
    expect(multiple.text()).toContain("5 versions");
  });
});
