import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it } from "vitest";
import CommentActions from "./CommentActions.vue";
import CommentMetadataBar from "./CommentMetadataBar.vue";
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
    const expandedMetadata = wrapper.findComponent(CommentMetadataBar).text();

    await wrapper.find("button[aria-expanded]").trigger("click");

    expect(wrapper.text()).not.toContain("Hot take");
    expect(wrapper.text()).not.toContain("You're wrong and you know it.");
    expect(wrapper.findComponent(CommentActions).exists()).toBe(false);
    const summary = wrapper.findComponent(CommentMetadataBar).text().replace(expandedMetadata, "");
    expect(summary).toContain(String(deepThread.replyPagination?.count));
    expect(wrapper.text()).toContain(deepThread.author.name);
  });

  it("shows a collapsed marker without a reply count when there are no replies", async () => {
    const wrapper = await mountCommentView(shortComment);
    const expandedMetadata = wrapper.findComponent(CommentMetadataBar).text();

    await wrapper.find("button[aria-expanded]").trigger("click");

    const marker = wrapper.findComponent(CommentMetadataBar).text().replace(expandedMetadata, "");
    expect(wrapper.text()).not.toContain("Nice.");
    expect(marker).toBeTruthy();
    expect(marker).not.toMatch(/\d/);
  });

  it("restores the body, actions, and replies on expand", async () => {
    const wrapper = await mountCommentView(deepThread);
    const expandedMetadata = wrapper.findComponent(CommentMetadataBar).text();
    const toggle = wrapper.find("button[aria-expanded]");

    await toggle.trigger("click");
    await toggle.trigger("click");

    expect(wrapper.text()).toContain("Hot take");
    expect(wrapper.text()).toContain("You're wrong and you know it.");
    expect(wrapper.findComponent(CommentActions).exists()).toBe(true);
    expect(wrapper.findComponent(CommentMetadataBar).text()).toBe(expandedMetadata);
  });

  it("collapses only the toggled subtree for nested replies", async () => {
    const wrapper = await mountCommentView(deepThread);
    const nested = wrapper
      .findAllComponents(CommentView)
      .find((view) => view.props("comment")?.id === "101");
    expect(nested).toBeDefined();
    const expandedMetadata = nested!.findComponent(CommentMetadataBar).text();

    await nested!.find("button[aria-expanded]").trigger("click");

    expect(wrapper.text()).toContain("Hot take");
    expect(wrapper.text()).not.toContain("You're wrong and you know it.");
    expect(wrapper.text()).not.toContain("Explain yourself.");
    expect(wrapper.text()).toContain("My editor converts tabs to spaces");
    const summary = nested!.findComponent(CommentMetadataBar).text().replace(expandedMetadata, "");
    expect(summary).toContain(String(nested!.props("comment")?.replyPagination?.count));
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
    const collapseLabel = toggle.attributes("aria-label");
    expect(collapseLabel).toBeTruthy();

    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    const expandLabel = toggle.attributes("aria-label");
    expect(expandLabel).toBeTruthy();
    expect(expandLabel).not.toBe(collapseLabel);

    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(toggle.attributes("aria-label")).toBe(collapseLabel);
  });
});
