import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import CommentInput from "./CommentInput.vue";
import CommentView from "./CommentView.vue";
import ConfirmDeleteCommentDialog from "./ConfirmDeleteCommentDialog.vue";
import { editedComment, noRepliesComment, shortComment } from "./fixtures";
import {
  mountCommentsPanel,
  resetCommentMocks,
  useProfileMock,
  useToastMock,
} from "~~/tests/helpers";

mockNuxtImport("useProfile", () => () => useProfileMock());
mockNuxtImport("useToast", () => () => useToastMock());

const flatComments = [shortComment, editedComment, noRepliesComment];

beforeEach(() => {
  resetCommentMocks();
});

describe("CommentsPanel", () => {
  it("renders a CommentView for every top-level comment", async () => {
    const wrapper = await mountCommentsPanel(flatComments);
    expect(wrapper.findAllComponents(CommentView)).toHaveLength(flatComments.length);
    expect(wrapper.text()).toContain("Nice.");
    expect(wrapper.text()).toContain("I fixed a typo in this one.");
    expect(wrapper.text()).toContain("Standalone comment with no thread.");
  });

  it("shows the top-level comment input by default", async () => {
    const wrapper = await mountCommentsPanel(flatComments);
    expect(wrapper.findComponent(CommentInput).exists()).toBe(true);
    expect(wrapper.findComponent(CommentView).props("readOnly")).toBe(false);
  });

  it("hides the comment input and marks comments read-only when the readOnly prop is set", async () => {
    const wrapper = await mountCommentsPanel(flatComments, { readOnly: true });
    expect(wrapper.findComponent(CommentInput).exists()).toBe(false);
    expect(wrapper.findComponent(CommentView).props("readOnly")).toBe(true);
  });

  it("opens the delete confirmation dialog when a comment emits delete", async () => {
    const wrapper = await mountCommentsPanel(flatComments);
    const dialog = wrapper.findComponent(ConfirmDeleteCommentDialog);
    expect(dialog.props("open")).toBe(false);

    wrapper.findComponent(CommentView).vm.$emit("delete", { commentId: shortComment.id });
    await nextTick();

    expect(dialog.props("open")).toBe(true);
  });

  it("re-emits write when a comment view reports a write attempt", async () => {
    const wrapper = await mountCommentsPanel(flatComments);

    wrapper.findComponent(CommentView).vm.$emit("write");
    await nextTick();

    expect(wrapper.emitted("write")).toHaveLength(1);
  });
});
