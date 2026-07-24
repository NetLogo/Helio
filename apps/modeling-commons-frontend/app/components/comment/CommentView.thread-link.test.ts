import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it } from "vitest";
import CommentMetadataBar from "./CommentMetadataBar.vue";
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

type Wrapper = Awaited<ReturnType<typeof mountCommentView>>;
const continueLinks = (wrapper: Wrapper) => wrapper.findAll('[data-testid="continue-thread-link"]');

describe("continue-thread link at the nesting limit", () => {
  it("renders a model-scoped thread link instead of the see-more button", async () => {
    const wrapper = await mountCommentView(deepThread, { maximumNested: 0 });

    const links = continueLinks(wrapper);
    expect(links).toHaveLength(1);
    expect(links[0]!.attributes("href")).toBe(threadHref(deepThread));
    expect(links[0]!.text()).toContain(String(deepThread.replyPagination?.count));
    expect(wrapper.findComponent(CommentSeeMore).exists()).toBe(false);
  });

  it("does not emit load when the thread link is clicked", async () => {
    const wrapper = await mountCommentView(deepThread, { maximumNested: 0 });

    await continueLinks(wrapper)[0]!.trigger("click");

    expect(wrapper.emitted("load")).toBeUndefined();
  });

  it("renders a thread link per branch that hits the limit", async () => {
    const wrapper = await mountCommentView(deepThread, { maximumNested: 1 });

    const hrefs = continueLinks(wrapper).map((link) => link.attributes("href"));
    expect(hrefs).toContain(`/models/${DEMO_MODEL_ID}/comments/101`);
    expect(hrefs).toContain(`/models/${DEMO_MODEL_ID}/comments/111`);
    expect(wrapper.findComponent(CommentSeeMore).exists()).toBe(false);
  });

  it("keeps the see-more button and shows no link above the limit", async () => {
    const partiallyLoaded = { ...longComment, replyPagination: { count: 5, lastPage: 1 } };
    const wrapper = await mountCommentView(partiallyLoaded);

    expect(wrapper.findComponent(CommentSeeMore).exists()).toBe(true);
    expect(continueLinks(wrapper)).toHaveLength(0);
  });

  it("renders neither link nor see-more at the limit with zero replies", async () => {
    const wrapper = await mountCommentView(shortComment, { maximumNested: 0 });

    expect(continueLinks(wrapper)).toHaveLength(0);
    expect(wrapper.findComponent(CommentSeeMore).exists()).toBe(false);
  });

  it("hides the affordance entirely at the limit when modelId is missing", async () => {
    const wrapper = await mountCommentView(withoutModelId(deepThread), { maximumNested: 0 });

    expect(continueLinks(wrapper)).toHaveLength(0);
    expect(wrapper.findComponent(CommentSeeMore).exists()).toBe(false);
  });
});

describe("date link to the thread page", () => {
  it("passes the model-scoped thread link to the metadata bar", async () => {
    const wrapper = await mountCommentView(shortComment);

    expect(wrapper.getComponent(CommentMetadataBar).props("threadLink")).toBe(
      threadHref(shortComment),
    );
  });

  it("passes no thread link when modelId is missing", async () => {
    const wrapper = await mountCommentView(withoutModelId(shortComment));

    expect(wrapper.getComponent(CommentMetadataBar).props("threadLink")).toBeUndefined();
  });

  it("renders the date as a link to the comment's thread page", async () => {
    const wrapper = await mountCommentView(shortComment);

    expect(wrapper.find(`a[href="${threadHref(shortComment)}"]`).exists()).toBe(true);
  });

  it("gives every rendered comment a date link to its own thread", async () => {
    const wrapper = await mountCommentView(longComment);

    for (const id of ["1", "2", "3"]) {
      expect(wrapper.find(`a[href="/models/${DEMO_MODEL_ID}/comments/${id}"]`).exists()).toBe(
        true,
      );
    }
  });
});
