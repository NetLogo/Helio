import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { UAvatar } from "#components";
import CommentActions from "./CommentActions.vue";
import CommentInput from "./CommentInput.vue";
import CommentView from "./CommentView.vue";
import { editedComment, longComment, shortComment } from "./fixtures";
import { mountCommentView, useProfileMock, useUserMock } from "~~/tests/helpers";

const navigateToMock = vi.hoisted(() => vi.fn());
mockNuxtImport("useUser", () => () => useUserMock());
mockNuxtImport("useProfile", () => () => useProfileMock());
mockNuxtImport("navigateTo", () => navigateToMock);

describe("CommentView rendering", () => {
  it("renders the author name, content, and like count", async () => {
    const wrapper = await mountCommentView(shortComment);
    expect(wrapper.text()).toContain(shortComment.author.name);
    expect(wrapper.text()).toContain(shortComment.content);
    expect(wrapper.findComponent(CommentActions).props("likes")).toBe(shortComment.likes);
  });

  it("marks edited comments", async () => {
    const edited = await mountCommentView(editedComment);
    const unedited = await mountCommentView({ ...editedComment, edited: false });
    expect(edited.text()).not.toBe(unedited.text());
  });

  it("renders nested replies", async () => {
    const wrapper = await mountCommentView(longComment);
    expect(wrapper.text()).toContain("This is a reply to the comment.");
    expect(wrapper.text()).toContain("And this is a nested reply.");
    expect(wrapper.text()).toContain("Short one.");
  });
});

describe("CommentView author profile links", () => {
  it("wraps the avatar in a link to the author's profile", async () => {
    const wrapper = await mountCommentView(shortComment);

    const avatar = wrapper.findComponent(UAvatar);
    expect(avatar.exists()).toBe(true);
    expect(avatar.element.closest("a")?.getAttribute("href")).toBe(shortComment.author.url);
  });

  it("leaves the avatar unwrapped when the author has no profile url", async () => {
    const wrapper = await mountCommentView({
      ...shortComment,
      author: { ...shortComment.author, url: undefined },
    });

    const avatar = wrapper.findComponent(UAvatar);
    expect(avatar.exists()).toBe(true);
    expect(avatar.element.closest("a")).toBeNull();
  });

  it("links the author name to the same profile url", async () => {
    const wrapper = await mountCommentView(shortComment);

    const nameLink = wrapper
      .findAll(`a[href="${shortComment.author.url}"]`)
      .find((link) => link.text().includes(shortComment.author.name));
    expect(nameLink).toBeDefined();
  });
});

describe("CommentView interactions", () => {
  it("emits like with its own id when not yet liked", async () => {
    const wrapper = await mountCommentView(shortComment);
    wrapper.findComponent(CommentActions).vm.$emit("like");

    expect(wrapper.emitted("like")).toEqual([[{ commentId: shortComment.id }]]);
    expect(wrapper.emitted("unlike")).toBeUndefined();
  });

  it("emits unlike when already liked by me", async () => {
    const wrapper = await mountCommentView(editedComment);
    wrapper.findComponent(CommentActions).vm.$emit("like");

    expect(wrapper.emitted("unlike")).toEqual([[{ commentId: editedComment.id }]]);
    expect(wrapper.emitted("like")).toBeUndefined();
  });

  it("emits delete with its own id", async () => {
    const wrapper = await mountCommentView(shortComment);
    wrapper.findComponent(CommentActions).vm.$emit("delete");

    expect(wrapper.emitted("delete")).toEqual([[{ commentId: shortComment.id }]]);
  });

  it("opens a reply input targeting the author and emits reply on submit", async () => {
    const wrapper = await mountCommentView(shortComment);
    expect(wrapper.findComponent(CommentInput).exists()).toBe(false);

    wrapper.findComponent(CommentActions).vm.$emit("reply");
    await nextTick();

    const input = wrapper.findComponent(CommentInput);
    expect(input.exists()).toBe(true);
    expect(input.props("target")).toBe(shortComment.author.name);

    input.vm.$emit("submit", "A brand new reply");
    await nextTick();

    expect(wrapper.emitted("reply")).toEqual([
      [{ commentId: shortComment.id, content: "A brand new reply" }],
    ]);
    expect(wrapper.findComponent(CommentInput).exists()).toBe(false);
  });

  it("opens an edit input seeded with the content and emits edit on submit", async () => {
    const wrapper = await mountCommentView(editedComment);

    wrapper.findComponent(CommentActions).vm.$emit("edit");
    await nextTick();

    const input = wrapper.findComponent(CommentInput);
    expect(input.exists()).toBe(true);
    expect(input.props("initialText")).toBe(editedComment.content);
    expect(input.props("isEditing")).toBe(true);

    input.vm.$emit("submit", "Updated content");
    await nextTick();

    expect(wrapper.emitted("edit")).toEqual([
      [{ commentId: editedComment.id, content: "Updated content" }],
    ]);
    expect(wrapper.findComponent(CommentInput).exists()).toBe(false);
  });

  it("routes to the thread page instead of an inline composer at the nesting limit", async () => {
    navigateToMock.mockClear();
    const wrapper = await mountCommentView(shortComment, { maximumNested: 0 });

    wrapper.findComponent(CommentActions).vm.$emit("reply");
    await nextTick();

    expect(wrapper.findComponent(CommentInput).exists()).toBe(false);
    expect(navigateToMock).toHaveBeenCalledWith(
      `/models/${shortComment.modelId}/comments/${shortComment.id}`,
    );
  });

  it("opens an inline composer above the nesting limit", async () => {
    navigateToMock.mockClear();
    const wrapper = await mountCommentView(shortComment, { maximumNested: 2 });

    wrapper.findComponent(CommentActions).vm.$emit("reply");
    await nextTick();

    expect(wrapper.findComponent(CommentInput).exists()).toBe(true);
    expect(navigateToMock).not.toHaveBeenCalled();
  });

  it("bubbles events from nested replies with the reply's payload", async () => {
    const wrapper = await mountCommentView(longComment);
    const nested = wrapper
      .findAllComponents(CommentView)
      .find((view) => view.props("comment")?.id === "3");
    expect(nested).toBeDefined();

    nested!.vm.$emit("like", { commentId: "3" });
    expect(wrapper.emitted("like")).toEqual([[{ commentId: "3" }]]);

    nested!.vm.$emit("delete", { commentId: "3" });
    expect(wrapper.emitted("delete")).toEqual([[{ commentId: "3" }]]);
  });
});

describe("CommentView highlight", () => {
  const rootOf = (wrapper: Awaited<ReturnType<typeof mountCommentView>>, id: string) =>
    wrapper.find(`[data-comment-id="${id}"]`);

  it("gives the highlighted comment a distinct, focusable root", async () => {
    const plain = await mountCommentView(shortComment);
    const highlighted = await mountCommentView(shortComment, {
      highlightedCommentId: shortComment.id,
    });

    const plainRoot = rootOf(plain, shortComment.id);
    const highlightedRoot = rootOf(highlighted, shortComment.id);

    expect(highlightedRoot.attributes("tabindex")).toBe("-1");
    expect(plainRoot.attributes("tabindex")).toBeUndefined();
    expect(highlightedRoot.attributes("class")).not.toBe(plainRoot.attributes("class"));
  });

  it("applies no highlight treatment for a non-matching id", async () => {
    const plain = await mountCommentView(shortComment);
    const nonMatching = await mountCommentView(shortComment, {
      highlightedCommentId: "someone-else",
    });

    expect(rootOf(nonMatching, shortComment.id).attributes("tabindex")).toBeUndefined();
    expect(rootOf(nonMatching, shortComment.id).attributes("class")).toBe(
      rootOf(plain, shortComment.id).attributes("class"),
    );
  });

  it("scrolls to and focuses the highlighted root on mount only", async () => {
    const scrollSpy = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
    const focusSpy = vi.spyOn(HTMLElement.prototype, "focus").mockImplementation(() => {});

    try {
      await mountCommentView(shortComment);
      expect(scrollSpy).not.toHaveBeenCalled();

      await mountCommentView(shortComment, { highlightedCommentId: shortComment.id });
      expect(scrollSpy).toHaveBeenCalledWith({ block: "center" });
      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    } finally {
      scrollSpy.mockRestore();
      focusSpy.mockRestore();
    }
  });

  it("emits highlight-dismiss on focusout only while highlighted", async () => {
    const highlighted = await mountCommentView(shortComment, {
      highlightedCommentId: shortComment.id,
    });
    await rootOf(highlighted, shortComment.id).trigger("focusout");
    expect(highlighted.emitted("highlight-dismiss")).toHaveLength(1);

    const plain = await mountCommentView(shortComment);
    await rootOf(plain, shortComment.id).trigger("focusout");
    expect(plain.emitted("highlight-dismiss")).toBeUndefined();
  });

  it("threads the highlight to nested replies and bubbles the dismiss", async () => {
    const wrapper = await mountCommentView(longComment, { highlightedCommentId: "3" });

    const nested = wrapper
      .findAllComponents(CommentView)
      .find((view) => view.props("comment")?.id === "3");
    expect(nested).toBeDefined();
    expect(nested!.props("highlightedCommentId")).toBe("3");
    expect(nested!.attributes("tabindex")).toBe("-1");
    expect(rootOf(wrapper, longComment.id).attributes("tabindex")).toBeUndefined();

    await nested!.trigger("focusout");
    expect(wrapper.emitted("highlight-dismiss")).toHaveLength(1);
  });
});

describe("CommentView read-only", () => {
  it("emits write instead of opening the reply input", async () => {
    const wrapper = await mountCommentView(shortComment, { readOnly: true });

    wrapper.findComponent(CommentActions).vm.$emit("reply");
    await nextTick();

    expect(wrapper.emitted("write")).toHaveLength(1);
    expect(wrapper.findComponent(CommentInput).exists()).toBe(false);
  });

  it("emits write instead of like and delete", async () => {
    const wrapper = await mountCommentView(shortComment, { readOnly: true });
    const actions = wrapper.findComponent(CommentActions);

    actions.vm.$emit("like");
    actions.vm.$emit("delete");

    expect(wrapper.emitted("like")).toBeUndefined();
    expect(wrapper.emitted("delete")).toBeUndefined();
    expect(wrapper.emitted("write")).toHaveLength(2);
  });
});
