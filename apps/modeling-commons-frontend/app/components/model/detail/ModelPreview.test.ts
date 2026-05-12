import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ModelPreview from "./ModelPreview.vue";

describe("ModelPreview", () => {
  it("mounts without crashing when given no preview url", async () => {
    const wrapper = await mountSuspended(ModelPreview, { props: {} });
    expect(wrapper.exists()).toBe(true);
  });

  it("mounts with a preview url and netlogo version", async () => {
    const wrapper = await mountSuspended(ModelPreview, {
      props: {
        previewUrl: "https://example.com/preview.png",
        netlogoVersion: "6.4.0",
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it.todo("preview image rendering and recordView lifecycle currently live in ModelDetail.vue, not in ModelPreview");
});
