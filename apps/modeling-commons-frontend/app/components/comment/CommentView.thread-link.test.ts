import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it } from "vitest";
import CommentSeeMore from "./CommentSeeMore.vue";
import { DEMO_MODEL_ID, deepThread, longComment, shortComment } from "./fixtures";
import type { Comment } from "./types";
import { mountCommentView, resetCommentMocks, useProfileMock, useUserMock } from "~~/tests/helpers";

mockNuxtImport("useUser", () => () => useUserMock());
mockNuxtImport("useProfile", () => () => useProfileMock());

beforeEach(() => {
  resetCommentMocks();
});

const threadHref = (comment: Comment) => `/models/${comment.modelId}/comments/${comment.id}`;

const withoutModelId = (comment: Comment): Comment => ({
  ...comment,
  modelId: undefined,
  replies: comment.replies?.map(withoutModelId),
});

describe("continue-thread link at the nesting limit", () => {
  it("renders a model-scoped thread link instead of the see-more button", async () => {
    const wrapper = await mountCommentView(deepThread, { maximumNested: 0 });

    const link = wrapper.find(`a[href="${threadHref(deepThread)}"]`);
    expect(link.exists()).toBe(true);
    expect(link.text()).toContain("Continue this thread");
    expect(link.text()).toContain("4 replies");
    expect(wrapper.findComponent(CommentSeeMore).exists()).toBe(false);
  });

  it("does not emit load when the thread link is clicked", async () => {
    const wrapper = await mountCommentView(deepThread, { maximumNested: 0 });

    await wrapper.find(`a[href="${threadHref(deepThread)}"]`).trigger("click");

    expect(wrapper.emitted("load")).toBeUndefined();
  });

  it("renders a thread link per branch that hits the limit", async () => {
    const wrapper = await mountCommentView(deepThread, {
      maximumNested: 1,
      maximumShownRepliesPerLevel: 5,
    });

    expect(wrapper.find(`a[href="/models/${DEMO_MODEL_ID}/comments/101"]`).exists()).toBe(true);
    expect(wrapper.find(`a[href="/models/${DEMO_MODEL_ID}/comments/111"]`).exists()).toBe(true);
    expect(wrapper.findComponent(CommentSeeMore).exists()).toBe(false);
  });

  it("keeps the see-more button and shows no link above the limit", async () => {
    const wrapper = await mountCommentView(longComment, { maximumShownRepliesPerLevel: 1 });

    expect(wrapper.findComponent(CommentSeeMore).exists()).toBe(true);
    expect(wrapper.find('a[href*="/comments/"]').exists()).toBe(false);
  });

  it("renders neither link nor see-more at the limit with zero replies", async () => {
    const wrapper = await mountCommentView(shortComment, { maximumNested: 0 });

    expect(wrapper.find('a[href*="/comments/"]').exists()).toBe(false);
    expect(wrapper.findComponent(CommentSeeMore).exists()).toBe(false);
  });

  it("hides the affordance entirely at the limit when modelId is missing", async () => {
    const wrapper = await mountCommentView(withoutModelId(deepThread), { maximumNested: 0 });

    expect(wrapper.find('a[href*="/comments/"]').exists()).toBe(false);
    expect(wrapper.findComponent(CommentSeeMore).exists()).toBe(false);
  });
});
