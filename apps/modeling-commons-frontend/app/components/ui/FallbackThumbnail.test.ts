import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import FallbackThumbnail from "./FallbackThumbnail.vue";

describe("FallbackThumbnail", () => {
  it("renders an img element", async () => {
    const wrapper = await mountSuspended(FallbackThumbnail);
    expect(wrapper.find("img").exists()).toBe(true);
  });

  it("sets a non-empty src attribute on the img", async () => {
    const wrapper = await mountSuspended(FallbackThumbnail);
    const src = wrapper.find("img").attributes("src");
    expect(src).toBeTruthy();
    expect(src?.length ?? 0).toBeGreaterThan(0);
  });

  it("renders deterministically across mounts (currently a fixed thumbnail)", async () => {
    const first = await mountSuspended(FallbackThumbnail);
    const second = await mountSuspended(FallbackThumbnail);
    expect(first.find("img").attributes("src")).toBe(second.find("img").attributes("src"));
  });
});
