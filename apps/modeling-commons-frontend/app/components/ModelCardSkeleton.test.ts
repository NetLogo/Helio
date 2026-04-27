import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ModelCardSkeleton from "./ModelCardSkeleton.vue";

describe("ModelCardSkeleton", () => {
  it("renders without props", async () => {
    const wrapper = await mountSuspended(ModelCardSkeleton);
    expect(wrapper.element).toBeTruthy();
    expect(wrapper.html()).toContain("animate-pulse");
  });
});
