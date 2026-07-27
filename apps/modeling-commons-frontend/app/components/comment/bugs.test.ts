/**
 * Regression suite for the nested-comments feature.
 */
import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  installCommentFetchMock,
  mountCommentView,
  mountCommentsPanel,
  mountCommentsSection,
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
  installCommentFetchMock();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CommentsPanel bugs", () => {
  // remainingComments reads pagination.count (clamped at 0),
  // so the load-more button renders whenever the server holds more comments.
  it("shows a load-more button when pagination.count exceeds the shown comments", async () => {
    const wrapper = await mountCommentsPanel(flatComments, {
      pagination: { count: 12, lastPage: 4 },
    });

    const loadMore = wrapper.findAll("button").find((button) => button.text().includes("9"));
    expect(loadMore, "expected a load-more button showing the 9-comment remainder").toBeDefined();
  });

  // Confirming emits delete and reflects the parent's `pending` as the dialog's
  // loading state; the dialog closes once the delete round-trip settles
  // (pending returns to false).
  it("closes the delete dialog once the delete settles", async () => {
    const wrapper = await mountCommentsPanel(flatComments);
    wrapper.findComponent(CommentView).vm.$emit("delete", { commentId: shortComment.id });
    await nextTick();

    const dialog = wrapper.findComponent(ConfirmDeleteCommentDialog);
    expect(dialog.props("open")).toBe(true);

    dialog.vm.$emit("confirm");
    await nextTick();
    expect(wrapper.emitted("delete")).toEqual([[{ commentId: shortComment.id }]]);

    // Parent drives the delete: pending flips on, then off when it settles.
    await wrapper.setProps({ pending: true });
    await nextTick();
    expect(dialog.props("deleting")).toBe(true);

    await wrapper.setProps({ pending: false });
    await nextTick();
    expect(dialog.props("open")).toBe(false);
    expect(dialog.props("deleting")).toBe(false);
  });

  // The composer holds the user's text until a submission actually succeeds, so
  // a rejected create is not silently lost. It clears only once the submit token
  // advances past its value at submit time.
  it("clears the top-level composer only after a successful create", async () => {
    const wrapper = await mountCommentsPanel(flatComments);

    const textarea = wrapper.find("textarea");
    await textarea.setValue("A fresh top-level comment");
    await textarea.trigger("keydown", { key: "Enter" });

    expect(wrapper.emitted("create")).toEqual([[{ content: "A fresh top-level comment" }]]);
    // Still holds the text while the create is in flight.
    expect((textarea.element as HTMLTextAreaElement).value).toBe("A fresh top-level comment");

    await wrapper.setProps({ submitToken: 1 });
    await nextTick();
    expect((textarea.element as HTMLTextAreaElement).value).toBe("");
  });
});

describe("CommentsSection bugs", () => {
  // the effective read-only state (`props.readOnly || !isLoggedIn`)
  // now lives on CommentsSection, so a consumer can force a read-only discussion
  // for a logged-in user.
  it("respects an explicit readOnly prop even when the user is logged in", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1", readOnly: true });

    expect(wrapper.findComponent(CommentInput).exists()).toBe(false);
    expect(wrapper.findComponent(CommentView).props("readOnly")).toBe(true);
  });
});

describe("CommentView bugs", () => {
  // Each recursion level renders one step shallower, so the nesting bound
  // reaches every depth.
  it("narrows the nesting bound one level per recursion", async () => {
    const wrapper = await mountCommentView(deepThread, { maximumNested: 3 });

    const nested = wrapper
      .findAllComponents(CommentView)
      .find((view) => view.props("comment")?.id === "101");
    expect(nested).toBeDefined();
    expect(nested!.props("maximumNested")).toBe(2);
  });

  // `write` fires only on genuine write attempts — closing or
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

  // readOnly gates only the open transition, so an input that is
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

  // CommentView consumes CommentSeeMore's declared
  // see-more-replies emit. `load` fires once all loaded replies are revealed
  // and only a server remainder is left. (The former attribute-fallthrough
  // companion test is retired — the @click wiring it proved no longer exists.)
  it("emits load when CommentSeeMore fires its declared see-more-replies event", async () => {
    const partiallyLoaded = { ...longComment, replyPagination: { count: 5, lastPage: 1 } };
    const wrapper = await mountCommentView(partiallyLoaded);

    const seeMore = wrapper.findComponent(CommentSeeMore);
    expect(seeMore.exists()).toBe(true);
    expect(seeMore.props("replyCount")).toBe(3);

    seeMore.vm.$emit("see-more-replies");
    await nextTick();

    expect(wrapper.emitted("load")).toEqual([[{ commentId: longComment.id }]]);
  });

  // Every loaded reply renders immediately: the server bounds how many it
  // embeds, the client hides none. See-more therefore reflects only the server
  // remainder, and a click fetches the next page.
  it("shows all loaded replies and offers only the server remainder", async () => {
    const partiallyLoaded = { ...longComment, replyPagination: { count: 5, lastPage: 1 } };
    const wrapper = await mountCommentView(partiallyLoaded);

    expect(wrapper.text()).toContain("Short one.");

    const seeMore = wrapper.findComponent(CommentSeeMore);
    expect(seeMore.props("replyCount")).toBe(3);

    seeMore.vm.$emit("see-more-replies");
    await nextTick();

    expect(wrapper.emitted("load")).toEqual([[{ commentId: partiallyLoaded.id }]]);
  });

  // the recursive render passes the parent comment's author
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
    expect(editInput.find("textarea").attributes("placeholder")).toContain(deepThread.author.name);
  });

  // top-level comments have no parent, so their edit
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
  // any close that is not confirm-driven (ESC, overlay click,
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
  // Enter submits via `.exact`, so Shift+Enter falls through
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
  // trailing closers balanced by an opener inside the URL are
  // kept (e.g. Wikipedia links); unbalanced ones are still stripped.
  it("keeps the closing paren of a URL with balanced parentheses", async () => {
    const url = "https://en.wikipedia.org/wiki/Rust_(programming_language)";
    const wrapper = await mountSuspended(CommentTextRepresentation, {
      props: { text: `Read ${url} for context` },
    });

    expect(wrapper.find("a").attributes("href")).toBe(url);
  });
});
