import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it } from "vitest";
import CommentActions from "./CommentActions.vue";
import CommentView from "./CommentView.vue";
import { deepThread, shortComment } from "./fixtures";
import {
  mountCommentView,
  resetCommentMocks,
  setLoggedIn,
  useProfileMock,
  useUserMock,
} from "~~/tests/helpers";

mockNuxtImport("useUser", () => () => useUserMock());
mockNuxtImport("useProfile", () => () => useProfileMock());

beforeEach(() => {
  resetCommentMocks();
});

describe("CommentView collapsing", () => {
  it("hides the body, actions, and replies and shows a hidden-replies summary", async () => {
    const wrapper = await mountCommentView(deepThread);
    expect(wrapper.text()).toContain("Hot take");
    expect(wrapper.text()).toContain("You're wrong and you know it.");

    await wrapper.find("button[aria-expanded]").trigger("click");

    expect(wrapper.text()).not.toContain("Hot take");
    expect(wrapper.text()).not.toContain("You're wrong and you know it.");
    expect(wrapper.findComponent(CommentActions).exists()).toBe(false);
    expect(wrapper.text()).toContain("4 replies hidden");
    expect(wrapper.text()).toContain(deepThread.author.name);
  });

  it("shows a plain collapsed marker when there are no replies", async () => {
    const wrapper = await mountCommentView(shortComment);

    await wrapper.find("button[aria-expanded]").trigger("click");

    expect(wrapper.text()).not.toContain("Nice.");
    expect(wrapper.text()).toContain("collapsed");
    expect(wrapper.text()).not.toContain("hidden");
  });

  it("restores the body, actions, and replies on expand", async () => {
    const wrapper = await mountCommentView(deepThread);
    const toggle = wrapper.find("button[aria-expanded]");

    await toggle.trigger("click");
    await toggle.trigger("click");

    expect(wrapper.text()).toContain("Hot take");
    expect(wrapper.text()).toContain("You're wrong and you know it.");
    expect(wrapper.findComponent(CommentActions).exists()).toBe(true);
    expect(wrapper.text()).not.toContain("replies hidden");
  });

  it("collapses only the toggled subtree for nested replies", async () => {
    const wrapper = await mountCommentView(deepThread);
    const nested = wrapper
      .findAllComponents(CommentView)
      .find((view) => view.props("comment")?.id === "101");
    expect(nested).toBeDefined();

    await nested!.find("button[aria-expanded]").trigger("click");

    expect(wrapper.text()).toContain("Hot take");
    expect(wrapper.text()).not.toContain("You're wrong and you know it.");
    expect(wrapper.text()).not.toContain("Explain yourself.");
    expect(wrapper.text()).toContain("My editor converts tabs to spaces");
    expect(wrapper.text()).toContain("3 replies hidden");
  });

  it("collapses and expands when read-only and logged out without emitting write", async () => {
    setLoggedIn(false);
    const wrapper = await mountCommentView(deepThread, { readOnly: true });
    const toggle = wrapper.find("button[aria-expanded]");

    await toggle.trigger("click");
    expect(wrapper.text()).not.toContain("Hot take");

    await toggle.trigger("click");
    expect(wrapper.text()).toContain("Hot take");
    expect(wrapper.emitted("write")).toBeUndefined();
  });

  it("flips aria-expanded and the accessible label with the collapse state", async () => {
    const wrapper = await mountCommentView(shortComment);
    const toggle = wrapper.find("button[aria-expanded]");
    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(toggle.attributes("aria-label")).toBe("Collapse comment");

    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(toggle.attributes("aria-label")).toBe("Expand comment");

    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("true");
  });
});
