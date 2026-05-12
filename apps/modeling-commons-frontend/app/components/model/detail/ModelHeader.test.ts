import { describe, expect, it } from "vitest";
import { mockComponent, mountSuspended } from "@nuxt/test-utils/runtime";
import ModelHeader from "./ModelHeader.vue";

mockComponent("UTooltip", {
  setup(_, { slots }) {
    return () => slots.default?.();
  },
});

const baseProps = {
  title: "Wolf Sheep Predation",
  authors: [
    { name: "Ada Lovelace", image: undefined },
    { name: "Grace Hopper", image: undefined },
  ],
  primaryAuthor: { name: "Ada Lovelace" },
  createdAt: new Date("2026-04-01T00:00:00Z").toISOString(),
  modelVisibility: "public",
};

describe("ModelHeader", () => {
  it("renders the model title", async () => {
    const wrapper = await mountSuspended(ModelHeader, { props: baseProps });
    expect(wrapper.text()).toContain("Wolf Sheep Predation");
  });

  it("renders the primary author name", async () => {
    const wrapper = await mountSuspended(ModelHeader, { props: baseProps });
    expect(wrapper.text()).toContain("Ada Lovelace");
  });

  it("shows 'and N others' when multiple authors are present", async () => {
    const wrapper = await mountSuspended(ModelHeader, { props: baseProps });
    expect(wrapper.text()).toMatch(/and\s+1\s+other/);
  });

  it("renders the visibility label", async () => {
    const wrapper = await mountSuspended(ModelHeader, { props: baseProps });
    expect(wrapper.text()).toContain("public");
  });

  it("shows the download button when a downloadUrl is provided and emits download on click", async () => {
    const wrapper = await mountSuspended(ModelHeader, {
      props: { ...baseProps, downloadUrl: "https://example.com/model.nlogo" },
    });
    const downloadBtn = wrapper.findAll("button, a").find((b) => b.text().includes("Download"));
    expect(downloadBtn).toBeTruthy();
    await downloadBtn!.trigger("click");
    expect(wrapper.emitted("download")).toBeTruthy();
  });

  it("hides the download button when no downloadUrl is provided", async () => {
    const wrapper = await mountSuspended(ModelHeader, { props: baseProps });
    const downloadBtn = wrapper.findAll("button, a").find((b) => b.text().includes("Download"));
    expect(downloadBtn).toBeFalsy();
  });

  it.todo("ModelHeader has no built-in like button or version selector — those live in ModelStats and ModelDetail respectively");
});
