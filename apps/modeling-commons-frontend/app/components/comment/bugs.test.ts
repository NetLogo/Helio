/**
 * Regression suite for the nested-comments feature.
 */
import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { UModal } from "#components";
import CommentActions from "./CommentActions.vue";
import CommentInput from "./CommentInput.vue";
import CommentSeeMore from "./CommentSeeMore.vue";
import CommentTextRepresentation from "./CommentTextRepresentation.vue";
import CommentView from "./CommentView.vue";
import ConfirmDeleteCommentDialog from "./ConfirmDeleteCommentDialog.vue";
import { deepThread, editedComment, longComment, noRepliesComment, shortComment } from "./fixtures";
import {
  mountCommentView,
  mountCommentsPanel,
  resetCommentMocks,
  useProfileMock,
  useToastMock,
  useUserMock,
} from "~~/tests/helpers";

mockNuxtImport("useUser", () => () => useUserMock());
mockNuxtImport("useProfile", () => () => useProfileMock());
mockNuxtImport("useToast", () => () => useToastMock());

const flatComments = [shortComment, editedComment, noRepliesComment];

beforeEach(() => {
  resetCommentMocks();
});

describe("CommentsPanel bugs", () => {
  // BUG-1 (fixed): remainingComments reads pagination.count (clamped at 0),
  // so the load-more button renders whenever the server holds more comments.
  it("shows a load-more button when pagination.count exceeds the shown comments", async () => {
    const wrapper = await mountCommentsPanel(flatComments, {
      pagination: { count: 12, lastPage: 4 },
    });

    const loadMore = wrapper
      .findAll("button")
      .find((button) => button.text().includes("9"));
    expect(loadMore, "expected a load-more button showing the 9-comment remainder").toBeDefined();
  });

  // BUG-2 (fixed): handleDelete closes the dialog and resets `deleting` in a
  // finally, so the dialog cannot get stuck open or permanently loading.
  it("closes the delete dialog and resets the loading state after confirm", async () => {
    const wrapper = await mountCommentsPanel(flatComments);
    wrapper.findComponent(CommentView).vm.$emit("delete", { commentId: shortComment.id });
    await nextTick();

    const dialog = wrapper.findComponent(ConfirmDeleteCommentDialog);
    expect(dialog.props("open")).toBe(true);

    dialog.vm.$emit("confirm");
    await nextTick();
    await nextTick();

    expect(dialog.props("open")).toBe(false);
    expect(dialog.props("deleting")).toBe(false);
  });

  // BUG-3 (fixed): the effective read-only state is `props.readOnly || !isLoggedIn`
  // (local computed renamed to isReadOnly), so a consumer can force a
  // read-only panel for a logged-in user.
  it("respects an explicit readOnly prop even when the user is logged in", async () => {
    const wrapper = await mountCommentsPanel(flatComments, { readOnly: true });

    expect(wrapper.findComponent(CommentInput).exists()).toBe(false);
    expect(wrapper.findComponent(CommentView).props("readOnly")).toBe(true);
  });

  // BUG-12 (fixed): CommentInput no longer clears itself on submit; the panel
  // clears its top-level composer only after emitting create. (Restore-on-failure
  // lands with the backend at the CommentsSection runOptimistic seam.)
  it("clears the top-level composer after emitting create", async () => {
    const wrapper = await mountCommentsPanel(flatComments);

    const textarea = wrapper.find("textarea");
    await textarea.setValue("A fresh top-level comment");
    await textarea.trigger("keydown", { key: "Enter" });

    expect(wrapper.emitted("create")).toEqual([[{ content: "A fresh top-level comment" }]]);
    expect((textarea.element as HTMLTextAreaElement).value).toBe("");
  });
});

describe("CommentView bugs", () => {
  // BUG-5 (fixed): the recursive <CommentView> render must pass
  // maximum-shown-replies-per-level down so every depth uses the configured value.
  it("propagates maximumShownRepliesPerLevel to nested reply levels", async () => {
    const wrapper = await mountCommentView(deepThread, { maximumShownRepliesPerLevel: 1 });

    const nested = wrapper
      .findAllComponents(CommentView)
      .find((view) => view.props("comment")?.id === "101");
    expect(nested).toBeDefined();
    expect(nested!.props("maximumShownRepliesPerLevel")).toBe(1);
  });

  // BUG-6 (fixed): `write` fires only on genuine write attempts — closing or
  // cancelling an input must not emit it.
  it("does not emit write when the reply input is closed via cancel", async () => {
    const wrapper = await mountCommentView(shortComment);

    wrapper.findComponent(CommentActions).vm.$emit("reply");
    await nextTick();
    expect(wrapper.emitted("write")).toHaveLength(1);

    wrapper.findComponent(CommentInput).vm.$emit("cancel");
    await nextTick();

    expect(wrapper.emitted("write")).toHaveLength(1);
  });

  // BUG-7 (fixed): readOnly gates only the open transition, so an input that is
  // already open stays closable if readOnly flips (e.g. session expiry).
  it("still allows closing an open reply input after readOnly becomes true", async () => {
    const wrapper = await mountCommentView(shortComment);

    wrapper.findComponent(CommentActions).vm.$emit("reply");
    await nextTick();
    expect(wrapper.findComponent(CommentInput).exists()).toBe(true);

    await wrapper.setProps({ readOnly: true });
    expect(wrapper.props("readOnly")).toBe(true);

    wrapper.findComponent(CommentInput).vm.$emit("cancel");
    await nextTick();

    expect(wrapper.findComponent(CommentInput).exists()).toBe(false);
  });

  // BUG-9 (fixed): CommentView consumes CommentSeeMore's declared
  // see-more-replies emit. `load` fires once all loaded replies are revealed
  // and only a server remainder is left. (The former attribute-fallthrough
  // companion test is retired — the @click wiring it proved no longer exists.)
  it("emits load when CommentSeeMore fires its declared see-more-replies event", async () => {
    const partiallyLoaded = { ...longComment, replyPagination: { count: 5, lastPage: 1 } };
    const wrapper = await mountCommentView(partiallyLoaded, { maximumShownRepliesPerLevel: 2 });

    const seeMore = wrapper.findComponent(CommentSeeMore);
    expect(seeMore.exists()).toBe(true);
    expect(seeMore.props("replyCount")).toBe(3);

    seeMore.vm.$emit("see-more-replies");
    await nextTick();

    expect(wrapper.emitted("load")).toEqual([[{ commentId: longComment.id }]]);
  });

  // BUG-8 residual (fixed): see-more first reveals locally loaded replies that
  // maximumShownRepliesPerLevel hid — it must not emit `load` for them.
  it("reveals hidden loaded replies on see-more without emitting load", async () => {
    const wrapper = await mountCommentView(longComment, { maximumShownRepliesPerLevel: 1 });

    expect(wrapper.text()).not.toContain("Short one.");
    const seeMore = wrapper.findComponent(CommentSeeMore);
    expect(seeMore.props("replyCount")).toBe(1);

    seeMore.vm.$emit("see-more-replies");
    await nextTick();

    expect(wrapper.emitted("load")).toBeUndefined();
    expect(wrapper.text()).toContain("Short one.");
    expect(wrapper.findComponent(CommentSeeMore).exists()).toBe(false);
  });

  // BUG-8 residual (fixed): after the reveal, see-more counts only the server
  // remainder and a further click emits `load`.
  it("shows the server remainder after revealing and emits load on the next click", async () => {
    const partiallyLoaded = { ...longComment, replyPagination: { count: 5, lastPage: 1 } };
    const wrapper = await mountCommentView(partiallyLoaded, { maximumShownRepliesPerLevel: 1 });

    const seeMore = wrapper.findComponent(CommentSeeMore);
    expect(seeMore.props("replyCount")).toBe(1);
    seeMore.vm.$emit("see-more-replies");
    await nextTick();

    const afterReveal = wrapper.findComponent(CommentSeeMore);
    expect(afterReveal.props("replyCount")).toBe(3);
    afterReveal.vm.$emit("see-more-replies");
    await nextTick();

    expect(wrapper.emitted("load")).toEqual([[{ commentId: partiallyLoaded.id }]]);
  });

  // BUG-13 (fixed): the recursive render passes the parent comment's author
  // name down, so editing a nested reply names the parent author.
  it("names the parent author in the edit placeholder of a nested reply", async () => {
    const wrapper = await mountCommentView(deepThread);

    const nested = wrapper
      .findAllComponents(CommentView)
      .find((view) => view.props("comment")?.id === "101");
    expect(nested).toBeDefined();
    expect(nested!.props("parentAuthorName")).toBe(deepThread.author.name);

    nested!.findComponent(CommentActions).vm.$emit("edit");
    await nextTick();

    const editInput = nested!.findComponent(CommentInput);
    expect(editInput.find("textarea").attributes("placeholder")).toContain(
      deepThread.author.name,
    );
  });

  // BUG-13 (fixed): top-level comments have no parent, so their edit
  // placeholder must not name anyone.
  it("keeps the edit placeholder free of author names for top-level comments", async () => {
    const wrapper = await mountCommentView(deepThread);

    wrapper.findComponent(CommentActions).vm.$emit("edit");
    await nextTick();

    const editInput = wrapper.findComponent(CommentInput);
    const placeholder = editInput.find("textarea").attributes("placeholder");
    expect(placeholder).toBeTruthy();
    expect(placeholder).not.toContain(deepThread.author.name);
  });
});

describe("ConfirmDeleteCommentDialog bugs", () => {
  // BUG-10 (fixed): any close that is not confirm-driven (ESC, overlay click,
  // Cancel button) emits `cancel` so the parent's cleanup always runs.
  it("emits cancel when the modal is dismissed via ESC/overlay", async () => {
    const wrapper = await mountSuspended(ConfirmDeleteCommentDialog, {
      props: { deleting: false, open: true },
    });

    const modal = wrapper.findComponent(UModal);
    expect(modal.exists()).toBe(true);

    modal.vm.$emit("update:open", false);
    await nextTick();

    expect(wrapper.emitted("update:open")).toEqual([[false]]);
    expect(wrapper.emitted("cancel")).toBeTruthy();
  });

  // BUG-10 (fixed) companion: a confirm-driven close must not fire a spurious
  // cancel on top of the confirm.
  it("does not emit cancel when the close follows a confirm", async () => {
    const wrapper = await mountSuspended(ConfirmDeleteCommentDialog, {
      props: { deleting: false, open: true },
    });

    const confirmButton = Array.from(document.body.querySelectorAll("button"))
      .filter((button) => /delete/i.test(button.textContent ?? ""))
      .at(-1);
    expect(confirmButton).toBeDefined();
    confirmButton!.click();
    await nextTick();
    expect(wrapper.emitted("confirm")).toHaveLength(1);

    await wrapper.setProps({ open: false });
    await nextTick();

    expect(wrapper.emitted("cancel")).toBeUndefined();
  });
});

describe("CommentInput bugs", () => {
  // BUG-11 (fixed): Enter submits via `.exact`, so Shift+Enter falls through
  // to the textarea and inserts a newline.
  it("inserts a newline instead of submitting on Shift+Enter", async () => {
    const wrapper = await mountSuspended(CommentInput, { props: {} });
    const textarea = wrapper.find("textarea");

    await textarea.setValue("line one");
    await textarea.trigger("keydown", { key: "Enter", shiftKey: true });

    expect(wrapper.emitted("submit")).toBeUndefined();
  });
});

describe("CommentTextRepresentation bugs", () => {
  // BUG-15 (fixed): trailing closers balanced by an opener inside the URL are
  // kept (e.g. Wikipedia links); unbalanced ones are still stripped.
  it("keeps the closing paren of a URL with balanced parentheses", async () => {
    const url = "https://en.wikipedia.org/wiki/Rust_(programming_language)";
    const wrapper = await mountSuspended(CommentTextRepresentation, {
      props: { text: `Read ${url} for context` },
    });

    expect(wrapper.find("a").attributes("href")).toBe(url);
  });
});
