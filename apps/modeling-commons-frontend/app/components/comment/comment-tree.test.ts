import { describe, expect, it } from "vitest";
import {
  findCommentById,
  hasSpine,
  hasVisibleReplies,
  insertReply,
  remainingCommentCount,
  remainingReplyCount,
  removeCommentById,
  serverRemainingReplyCount,
  updateCommentById,
} from "./comment-tree";
import { deepThread, editedComment, longComment, noRepliesComment, shortComment } from "./fixtures";
import type { Comment, CommentsPanelProps } from "./types";

const withoutReplies: Comment = { ...shortComment, replies: undefined };
const withoutPagination: Comment = { ...longComment, replyPagination: undefined };

const partiallyLoaded: Comment = { ...longComment, replyPagination: { count: 5, lastPage: 1 } };

describe("remainingReplyCount", () => {
  it("reports the server remainder at visible depths", () => {
    expect(remainingReplyCount(longComment, 4)).toBe(0);
    expect(remainingReplyCount(partiallyLoaded, 4)).toBe(3);
  });

  it("reports the full pagination count at the nesting limit for the continue-thread link", () => {
    expect(remainingReplyCount(longComment, 0)).toBe(2);
    expect(remainingReplyCount(partiallyLoaded, 0)).toBe(5);
  });

  it("clamps at zero when replies are fully loaded or pagination is missing", () => {
    expect(remainingReplyCount(withoutPagination, 4)).toBe(0);
  });
});

describe("serverRemainingReplyCount", () => {
  it("subtracts the loaded replies from the pagination count", () => {
    expect(serverRemainingReplyCount(partiallyLoaded)).toBe(3);
  });

  it("is zero when everything is loaded or pagination is missing", () => {
    expect(serverRemainingReplyCount(longComment)).toBe(0);
    expect(serverRemainingReplyCount(withoutPagination)).toBe(0);
  });
});

describe("hasVisibleReplies", () => {
  it("is true when depth remains and replies exist", () => {
    expect(hasVisibleReplies(longComment, 1)).toBe(true);
  });

  it("is false at the nesting limit even when replies exist", () => {
    expect(hasVisibleReplies(longComment, 0)).toBe(false);
  });

  it("is false without replies", () => {
    expect(hasVisibleReplies(shortComment, 4)).toBe(false);
    expect(hasVisibleReplies(withoutReplies, 4)).toBe(false);
  });
});

describe("hasSpine", () => {
  it("is true when replies are visible", () => {
    expect(hasSpine(longComment, 4)).toBe(true);
  });

  it("is true at the nesting limit when the server still holds replies", () => {
    expect(hasSpine(longComment, 0)).toBe(true);
  });

  it("is false for a comment without replies", () => {
    expect(hasSpine(shortComment, 4)).toBe(false);
  });
});

describe("remainingCommentCount", () => {
  it("subtracts the shown comments from the pagination count", () => {
    expect(remainingCommentCount([shortComment], { count: 10, lastPage: 4 })).toBe(9);
  });

  // BUGS.md #1 (fixed): the total lives in pagination.count, so the props
  // CommentsPanel actually passes yield a positive remainder.
  it("counts the remainder for the props CommentsPanel actually passes", () => {
    const panelProps: CommentsPanelProps = {
      comments: [shortComment, editedComment, noRepliesComment],
      pagination: { count: 10, lastPage: 4 },
    };
    expect(remainingCommentCount(panelProps.comments, panelProps.pagination)).toBe(7);
  });

  it("clamps at zero when more comments are shown than counted", () => {
    expect(remainingCommentCount([shortComment, editedComment], { count: 1, lastPage: 1 })).toBe(0);
  });

  it("is zero for an empty panel with an empty pagination", () => {
    expect(remainingCommentCount([], { count: 0, lastPage: 0 })).toBe(0);
  });
});

const cloneTree = (comments: Array<Comment>): Array<Comment> => structuredClone(comments);

const makeComment = (id: string, overrides: Partial<Comment> = {}): Comment => ({
  id,
  author: { name: "Test Author", image: "" },
  content: `comment ${id}`,
  createdAt: "2024-03-01T00:00:00",
  likes: 0,
  replies: [],
  replyPagination: { count: 0, lastPage: 0 },
  ...overrides,
});

describe("fixture parent stamping", () => {
  it("stamps every nested reply with its parent's id", () => {
    expect(findCommentById([deepThread], "103")?.parentId).toBe("102");
    expect(findCommentById([deepThread], "106")?.parentId).toBe("105");
    expect(findCommentById([longComment], "3")?.parentId).toBe("2");
  });

  it("leaves fixture roots without a parentId", () => {
    expect(deepThread.parentId).toBeUndefined();
    expect(longComment.parentId).toBeUndefined();
    expect(shortComment.parentId).toBeUndefined();
  });
});

describe("findCommentById", () => {
  it("finds a top-level comment", () => {
    expect(findCommentById([deepThread], "100")).toBe(deepThread);
  });

  it("finds a deeply nested comment", () => {
    expect(findCommentById([deepThread], "106")?.content).toContain("Lorem Ipsum");
  });

  it("searches across multiple roots", () => {
    expect(findCommentById([shortComment, longComment], "3")?.id).toBe("3");
  });

  it("returns null for an unknown id", () => {
    expect(findCommentById([deepThread, longComment], "nope")).toBeNull();
  });

  it("handles comments without a replies array", () => {
    expect(findCommentById([{ ...shortComment, replies: undefined }], "x")).toBeNull();
  });
});

describe("updateCommentById", () => {
  it("updates a top-level comment", () => {
    const next = updateCommentById([shortComment, editedComment], "5", (comment) => ({
      ...comment,
      content: "Updated.",
    }));
    expect(next[0]?.content).toBe("Updated.");
    expect(next[1]).toBe(editedComment);
  });

  it("updates a deeply nested comment without mutating the original tree", () => {
    const original = cloneTree([deepThread]);
    const next = updateCommentById(original, "105", (comment) => ({
      ...comment,
      likes: comment.likes + 1,
    }));
    expect(findCommentById(next, "105")?.likes).toBe(19);
    expect(findCommentById(original, "105")?.likes).toBe(18);
  });

  it("preserves references of untouched siblings", () => {
    const original = cloneTree([deepThread]);
    const next = updateCommentById(original, "101", (comment) => ({ ...comment, likes: 0 }));
    expect(next[0]?.replies?.[1]).toBe(original[0]?.replies?.[1]);
  });

  it("returns the same array reference when the id is not found", () => {
    const original = [shortComment, editedComment];
    expect(updateCommentById(original, "nope", (comment) => ({ ...comment, likes: 99 }))).toBe(
      original,
    );
  });
});

describe("insertReply", () => {
  it("prepends the reply and bumps the parent's replyPagination count", () => {
    const reply = makeComment("local-1");
    const next = insertReply(cloneTree([longComment]), "1", reply);
    const parent = findCommentById(next, "1");
    expect(parent?.replies?.[0]?.id).toBe("local-1");
    expect(parent?.replies).toHaveLength(3);
    expect(parent?.replyPagination).toEqual({ count: 3, lastPage: 1 });
  });

  it("inserts into a nested parent", () => {
    const next = insertReply(cloneTree([deepThread]), "103", makeComment("local-2"));
    const parent = findCommentById(next, "103");
    expect(parent?.replies?.map((r) => r.id)).toEqual(["local-2", "104", "107"]);
    expect(parent?.replyPagination?.count).toBe(3);
  });

  it("creates pagination and replies for a parent missing both", () => {
    const bare = makeComment("bare", { replies: undefined, replyPagination: undefined });
    const next = insertReply([bare], "bare", makeComment("local-3"));
    expect(next[0]?.replies).toHaveLength(1);
    expect(next[0]?.replyPagination).toEqual({ count: 1, lastPage: 0 });
  });

  it("returns the same array reference when the parent is not found", () => {
    const original = [shortComment];
    expect(insertReply(original, "nope", makeComment("local-4"))).toBe(original);
  });
});

describe("removeCommentById", () => {
  it("removes a top-level comment without touching reply counts", () => {
    const original = cloneTree([longComment, shortComment]);
    const next = removeCommentById(original, "5");
    expect(next.map((comment) => comment.id)).toEqual(["1"]);
    expect(next[0]).toBe(original[0]);
  });

  it("removes a nested comment and decrements its direct parent's count", () => {
    const next = removeCommentById(cloneTree([deepThread]), "104");
    expect(findCommentById(next, "104")).toBeNull();
    expect(findCommentById(next, "103")?.replyPagination?.count).toBe(1);
  });

  it("leaves ancestor counts untouched on a deep removal", () => {
    const next = removeCommentById(cloneTree([deepThread]), "106");
    expect(findCommentById(next, "105")?.replyPagination?.count).toBe(0);
    expect(findCommentById(next, "104")?.replyPagination?.count).toBe(1);
    expect(findCommentById(next, "100")?.replyPagination?.count).toBe(4);
  });

  it("does not decrement the parent's count below zero", () => {
    const parent = makeComment("p", {
      replies: [makeComment("c")],
      replyPagination: { count: 0, lastPage: 0 },
    });
    const next = removeCommentById([parent], "c");
    expect(next[0]?.replyPagination?.count).toBe(0);
  });

  it("returns the same array reference when the id is not found", () => {
    const original = [shortComment, editedComment];
    expect(removeCommentById(original, "nope")).toBe(original);
  });

  it("does not mutate the original tree", () => {
    const original = cloneTree([deepThread]);
    removeCommentById(original, "104");
    expect(findCommentById(original, "104")).not.toBeNull();
    expect(findCommentById(original, "103")?.replyPagination?.count).toBe(2);
  });
});
