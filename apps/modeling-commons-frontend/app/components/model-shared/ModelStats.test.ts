import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ModelStats from "./ModelStats.vue";

describe("ModelStats", () => {
  it("renders each provided stat in icon mode", async () => {
    const wrapper = await mountSuspended(ModelStats, {
      props: { likes: 3, downloads: 5, views: 12, runs: 7 },
    });
    const text = wrapper.text();
    expect(text).toContain("3");
    expect(text).toContain("5");
    expect(text).toContain("12");
    expect(text).toContain("7");
  });

  it("omits stats whose props are undefined", async () => {
    const wrapper = await mountSuspended(ModelStats, {
      props: { likes: 42 },
    });
    expect(wrapper.text()).toContain("42");
    expect(wrapper.text()).not.toContain("download");
    expect(wrapper.text()).not.toContain("view");
    expect(wrapper.text()).not.toContain("run");
  });

  it("renders stats as pluralized text when asText is true", async () => {
    const wrapper = await mountSuspended(ModelStats, {
      props: { likes: 3, downloads: 1, views: 0, runs: 2, asText: true },
    });
    const text = wrapper.text();
    expect(text).toContain("3 likes");
    expect(text).toContain("download");
    expect(text).toContain("0 views");
    expect(text).toContain("2 runs");
  });

  it("renders nothing meaningful when no stats are provided", async () => {
    const wrapper = await mountSuspended(ModelStats, { props: {} });
    expect(wrapper.text().trim()).toBe("");
  });

  it("renders a zero count distinct from undefined", async () => {
    const wrapper = await mountSuspended(ModelStats, {
      props: { likes: 0, asText: true, downloads: undefined },
    });
    expect(wrapper.text()).toContain("0 likes");
    expect(wrapper.text()).not.toContain("download");
  });
});
