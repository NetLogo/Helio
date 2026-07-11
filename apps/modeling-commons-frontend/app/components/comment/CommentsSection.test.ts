import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import CommentView from "./CommentView.vue";
import CommentsPanel from "./CommentsPanel.vue";
import { findCommentById } from "./comment-tree";
import { comments as fixtureComments } from "./fixtures";
import type { Comment, CommentPagination } from "./types";
import {
  mountCommentsSection,
  resetCommentMocks,
  routerReplaceMock,
  setLoggedIn,
  setRouteQuery,
  toastAddMock,
  useProfileMock,
  useRouteMock,
  useRouterMock,
  useToastMock,
  useUserMock,
} from "~~/tests/helpers";

mockNuxtImport("useUser", () => () => useUserMock());
mockNuxtImport("useProfile", () => () => useProfileMock());
mockNuxtImport("useToast", () => () => useToastMock());
mockNuxtImport("useRoute", () => () => useRouteMock());
mockNuxtImport("useRouter", () => () => useRouterMock());

beforeEach(() => {
  resetCommentMocks();
});

function panelComments(wrapper: Awaited<ReturnType<typeof mountCommentsSection>>) {
  return wrapper.getComponent(CommentsPanel).props("comments") as Array<Comment>;
}

function panelPagination(wrapper: Awaited<ReturnType<typeof mountCommentsSection>>) {
  return wrapper.getComponent(CommentsPanel).props("pagination") as CommentPagination;
}

async function emitFromPanel(
  wrapper: Awaited<ReturnType<typeof mountCommentsSection>>,
  event: string,
  payload?: unknown,
) {
  wrapper.getComponent(CommentsPanel).vm.$emit(event, payload);
  await nextTick();
}

describe("CommentsSection sources", () => {
  it("renders the panel with the fixture comments for a modelId", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    const comments = panelComments(wrapper);
    expect(comments.map((comment) => comment.id)).toEqual(
      fixtureComments.map((comment) => comment.id),
    );
    expect(panelPagination(wrapper)).toEqual({ count: fixtureComments.length, lastPage: 1 });
  });

  it("renders a single thread rooted at the given commentId", async () => {
    const wrapper = await mountCommentsSection({ commentId: "100" });

    const comments = panelComments(wrapper);
    expect(comments).toHaveLength(1);
    expect(comments[0]?.id).toBe("100");
    expect(comments[0]?.replies?.length).toBeGreaterThan(0);
    expect(panelPagination(wrapper)).toEqual({ count: 1, lastPage: 1 });
  });

  it("roots the thread at a nested commentId", async () => {
    const wrapper = await mountCommentsSection({ commentId: "103" });

    const comments = panelComments(wrapper);
    expect(comments[0]?.id).toBe("103");
  });

  it("renders an empty panel for an unknown commentId", async () => {
    const wrapper = await mountCommentsSection({ commentId: "does-not-exist" });

    expect(panelComments(wrapper)).toEqual([]);
    expect(panelPagination(wrapper)).toEqual({ count: 0, lastPage: 0 });
  });

  it("prefers modelId when both sources are given", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1", commentId: "100" });

    expect(panelComments(wrapper)).toHaveLength(fixtureComments.length);
  });

  it("renders nothing when neither source is given", async () => {
    const wrapper = await mountCommentsSection({});

    expect(wrapper.findComponent(CommentsPanel).exists()).toBe(false);
  });
});

describe("CommentsSection auth gating", () => {
  it("marks the panel read-only and toasts on write attempts when logged out", async () => {
    setLoggedIn(false);
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    expect(wrapper.getComponent(CommentsPanel).props("readOnly")).toBe(true);

    await emitFromPanel(wrapper, "write");
    expect(toastAddMock).toHaveBeenCalledTimes(1);
  });

  it("renders a writable panel and stays silent on write attempts when logged in", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    expect(wrapper.getComponent(CommentsPanel).props("readOnly")).toBe(false);

    await emitFromPanel(wrapper, "write");
    expect(toastAddMock).not.toHaveBeenCalled();
  });

  it("forces the panel read-only via the readOnly prop while logged in", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1", readOnly: true });

    expect(wrapper.getComponent(CommentsPanel).props("readOnly")).toBe(true);
  });
});

describe("CommentsSection highlight", () => {
  function viewFor(wrapper: Awaited<ReturnType<typeof mountCommentsSection>>, id: string) {
    return wrapper
      .findAllComponents(CommentView)
      .find((view) => view.props("comment")?.id === id);
  }

  it("threads the highlighted comment id from the URL down to the targeted comment", async () => {
    setRouteQuery({ highlightedCommentId: "5" });
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    expect(wrapper.getComponent(CommentsPanel).props("highlightedCommentId")).toBe("5");

    const target = viewFor(wrapper, "5");
    const other = viewFor(wrapper, "1");
    expect(target).toBeDefined();
    expect(other).toBeDefined();
    expect(target!.attributes("tabindex")).toBe("-1");
    expect(other!.attributes("tabindex")).toBeUndefined();
    expect(target!.attributes("class")).not.toBe(other!.attributes("class"));
  });

  it("clears the highlight and strips only its query param on focusout", async () => {
    setRouteQuery({ highlightedCommentId: "5", page: "2" });
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    const target = wrapper.find('[tabindex="-1"]');
    expect(target.exists()).toBe(true);

    await target.trigger("focusout");
    await nextTick();

    expect(wrapper.getComponent(CommentsPanel).props("highlightedCommentId")).toBeUndefined();
    expect(wrapper.find('[tabindex="-1"]').exists()).toBe(false);
    expect(routerReplaceMock).toHaveBeenCalledWith({ query: { page: "2" } });
  });

  it("highlights nothing for a non-matching id", async () => {
    setRouteQuery({ highlightedCommentId: "does-not-exist" });
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    expect(wrapper.getComponent(CommentsPanel).props("highlightedCommentId")).toBe(
      "does-not-exist",
    );
    expect(wrapper.find('[tabindex="-1"]').exists()).toBe(false);
  });

  it("ignores array and empty highlight query values", async () => {
    setRouteQuery({ highlightedCommentId: ["5", "7"] });
    const fromArray = await mountCommentsSection({ modelId: "model-1" });
    expect(fromArray.getComponent(CommentsPanel).props("highlightedCommentId")).toBeUndefined();

    setRouteQuery({ highlightedCommentId: "" });
    const fromEmpty = await mountCommentsSection({ modelId: "model-1" });
    expect(fromEmpty.getComponent(CommentsPanel).props("highlightedCommentId")).toBeUndefined();
  });
});

describe("CommentsSection optimistic mutations", () => {
  it("prepends a created comment authored by the current profile", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    await emitFromPanel(wrapper, "create", { content: "Fresh take" });

    const comments = panelComments(wrapper);
    expect(comments).toHaveLength(fixtureComments.length + 1);
    expect(comments[0]).toMatchObject({
      id: "local-1",
      content: "Fresh take",
      likes: 0,
      author: { name: "Ada Lovelace" },
      permissions: { canEdit: true, canDelete: true },
    });
    expect(panelPagination(wrapper).count).toBe(fixtureComments.length + 1);
  });

  it("inserts a reply into the target comment and bumps its reply count", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    await emitFromPanel(wrapper, "reply", { commentId: "1", content: "Replying here" });

    const parent = findCommentById(panelComments(wrapper), "1");
    expect(parent?.replies?.[0]).toMatchObject({ id: "local-1", content: "Replying here" });
    expect(parent?.replyPagination?.count).toBe(3);
    expect(panelPagination(wrapper).count).toBe(fixtureComments.length);
  });

  it("edits a comment's content and marks it edited", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    await emitFromPanel(wrapper, "edit", { commentId: "5", content: "Nicer." });

    const edited = findCommentById(panelComments(wrapper), "5");
    expect(edited?.content).toBe("Nicer.");
    expect(edited?.edited).toBe(true);
  });

  it("applies like and unlike to the target comment", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    await emitFromPanel(wrapper, "like", { commentId: "5" });
    let target = findCommentById(panelComments(wrapper), "5");
    expect(target).toMatchObject({ likes: 2, likedByMe: true });

    await emitFromPanel(wrapper, "unlike", { commentId: "5" });
    target = findCommentById(panelComments(wrapper), "5");
    expect(target).toMatchObject({ likes: 1, likedByMe: false });
  });

  it("removes a deleted top-level comment and decrements the pagination count", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    await emitFromPanel(wrapper, "delete", { commentId: "5" });

    expect(findCommentById(panelComments(wrapper), "5")).toBeNull();
    expect(panelComments(wrapper)).toHaveLength(fixtureComments.length - 1);
    expect(panelPagination(wrapper).count).toBe(fixtureComments.length - 1);
  });

  it("removes a nested comment and decrements only its parent's reply count", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    await emitFromPanel(wrapper, "delete", { commentId: "2" });

    const comments = panelComments(wrapper);
    expect(findCommentById(comments, "2")).toBeNull();
    expect(findCommentById(comments, "1")?.replyPagination?.count).toBe(1);
    expect(comments).toHaveLength(fixtureComments.length);
    expect(panelPagination(wrapper).count).toBe(fixtureComments.length);
  });

  it("does not wedge after consecutive mutations", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    await emitFromPanel(wrapper, "like", { commentId: "5" });
    await emitFromPanel(wrapper, "like", { commentId: "7" });
    await emitFromPanel(wrapper, "create", { content: "Still responsive" });

    const comments = panelComments(wrapper);
    expect(findCommentById(comments, "5")?.likes).toBe(2);
    expect(findCommentById(comments, "7")?.likes).toBe(8);
    expect(comments[0]?.content).toBe("Still responsive");
  });

  it("assigns unique local ids to successive creations", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    await emitFromPanel(wrapper, "create", { content: "First" });
    await emitFromPanel(wrapper, "reply", { commentId: "7", content: "Second" });

    const comments = panelComments(wrapper);
    expect(comments[0]?.id).toBe("local-1");
    expect(findCommentById(comments, "7")?.replies?.[0]?.id).toBe("local-2");
  });

  it("resets local optimistic state when the source changes", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    await emitFromPanel(wrapper, "create", { content: "Ephemeral" });
    expect(panelComments(wrapper)).toHaveLength(fixtureComments.length + 1);

    await wrapper.setProps({ modelId: "model-2" });
    await flushPromises();
    await nextTick();

    expect(panelComments(wrapper)).toHaveLength(fixtureComments.length);
    expect(findCommentById(panelComments(wrapper), "local-1")).toBeNull();
  });

  it("keeps load and load-more as inert seams", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    await emitFromPanel(wrapper, "load", { commentId: "1" });
    await emitFromPanel(wrapper, "load-more", panelPagination(wrapper));

    expect(panelComments(wrapper)).toHaveLength(fixtureComments.length);
  });
});
