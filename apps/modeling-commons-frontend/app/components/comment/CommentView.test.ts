import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import CommentActions from "./CommentActions.vue";
import CommentInput from "./CommentInput.vue";
import CommentView from "./CommentView.vue";
import { editedComment, longComment, shortComment } from "./fixtures";
import { mountCommentView, useProfileMock, useUserMock } from "~~/tests/helpers";

mockNuxtImport("useUser", () => () => useUserMock());
mockNuxtImport("useProfile", () => () => useProfileMock());

describe("CommentView rendering", () => {
  it("renders the author name, content, and like count", async () => {
    const wrapper = await mountCommentView(shortComment);
    expect(wrapper.text()).toContain(shortComment.author.name);
    expect(wrapper.text()).toContain(shortComment.content);
    expect(wrapper.findComponent(CommentActions).props("likes")).toBe(shortComment.likes);
  });

  it("marks edited comments", async () => {
    const wrapper = await mountCommentView(editedComment);
    expect(wrapper.text()).toContain("(edited)");
  });

  it("renders nested replies", async () => {
    const wrapper = await mountCommentView(longComment);
    expect(wrapper.text()).toContain("This is a reply to the comment.");
    expect(wrapper.text()).toContain("And this is a nested reply.");
    expect(wrapper.text()).toContain("Short one.");
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
