import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ModelStats from "./ModelStats.vue";

const baseProps = {
  likes: 12,
  downloads: 8,
  views: 340,
  runs: 25,
  likedByMe: false,
};

describe("ModelStats", () => {
  it("renders all four stat counts", async () => {
    const wrapper = await mountSuspended(ModelStats, { props: baseProps });
    expect(wrapper.text()).toContain("12");
    expect(wrapper.text()).toContain("8");
    expect(wrapper.text()).toContain("340");
    expect(wrapper.text()).toContain("25");
  });

  it("shows 'Like' label when not liked", async () => {
    const wrapper = await mountSuspended(ModelStats, { props: baseProps });
    expect(wrapper.text()).toContain("Like");
    expect(wrapper.text()).not.toContain("Liked");
  });

  it("shows 'Liked' label when liked", async () => {
    const wrapper = await mountSuspended(ModelStats, {
      props: { ...baseProps, likedByMe: true },
    });
    expect(wrapper.text()).toContain("Liked");
  });

  it("emits toggleLike when like button is clicked", async () => {
    const wrapper = await mountSuspended(ModelStats, { props: baseProps });
    const likeBtn = wrapper.findAll("button").find((b) => b.text().includes("Like"));
    expect(likeBtn).toBeTruthy();
    await likeBtn!.trigger("click");
    expect(wrapper.emitted("toggleLike")).toBeTruthy();
  });

  it("disables the like button while busy", async () => {
    const wrapper = await mountSuspended(ModelStats, {
      props: { ...baseProps, busy: true },
    });
    const likeBtn = wrapper.findAll("button").find((b) => b.text().includes("Like"));
    expect(likeBtn?.attributes("disabled")).toBeDefined();
  });

  it("formats large counts with locale separators", async () => {
    const wrapper = await mountSuspended(ModelStats, {
      props: { ...baseProps, views: 12345 },
    });
    expect(wrapper.text()).toContain((12345).toLocaleString());
  });

  it.todo("ModelStats does not render a loading skeleton — pending state is owned by the parent ModelDetail");
});
