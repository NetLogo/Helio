import type { Comment, CommentPagination } from "./types";

// `lastPage: null` means nothing has been loaded yet, so the next page to ask
// for is 0 rather than 1.
export function nextPageToLoad(pagination?: CommentPagination): number {
  const loaded = pagination?.lastPage;
  return loaded === null || loaded === undefined ? 0 : loaded + 1;
}

export function serverRemainingReplyCount(comment: Comment): number {
  const totalReplies = comment.replyPagination?.count ?? 0;
  return Math.max(0, totalReplies - (comment.replies ?? []).length);
}

// At the nesting limit the full pagination count feeds the continue-thread
// link; at visible depths every loaded reply is shown, so the remainder is
// simply what the server still holds (a see-more click turns it into a `load`).
export function remainingReplyCount(comment: Comment, maximumNested: number): number {
  if (maximumNested <= 0) return comment.replyPagination?.count ?? 0;
  return serverRemainingReplyCount(comment);
}

export function hasVisibleReplies(comment: Comment, maximumNested: number): boolean {
  return maximumNested > 0 && (comment.replies ?? []).length > 0;
}

export function hasSpine(comment: Comment, maximumNested: number): boolean {
  return (
    hasVisibleReplies(comment, maximumNested) ||
    remainingReplyCount(comment, maximumNested) > 0
  );
}

export function remainingCommentCount(
  comments: Array<Comment>,
  pagination: CommentPagination,
): number {
  return Math.max(0, pagination.count - comments.length);
}

export function findCommentById(comments: Array<Comment>, id: string): Comment | null {
  for (const comment of comments) {
    if (comment.id === id) return comment;
    const found = findCommentById(comment.replies ?? [], id);
    if (found) return found;
  }
  return null;
}

// The mutation helpers below are immutable: they return a new array when the
// target is found and the SAME array reference when nothing changed, so
// callers can reassign and untouched nodes keep their identity.
export function updateCommentById(
  comments: Array<Comment>,
  id: string,
  updater: (comment: Comment) => Comment,
): Array<Comment> {
  let changed = false;
  const next = comments.map((comment) => {
    if (comment.id === id) {
      changed = true;
      return updater(comment);
    }
    const replies = comment.replies ?? [];
    const nextReplies = updateCommentById(replies, id, updater);
    if (nextReplies === replies) return comment;
    changed = true;
    return { ...comment, replies: nextReplies };
  });
  return changed ? next : comments;
}

export function insertReply(
  comments: Array<Comment>,
  parentId: string,
  reply: Comment,
): Array<Comment> {
  return updateCommentById(comments, parentId, (parent) => ({
    ...parent,
    replies: [reply, ...(parent.replies ?? [])],
    replyPagination: {
      ...parent.replyPagination,
      lastPage: parent.replyPagination?.lastPage ?? null,
      count: (parent.replyPagination?.count ?? 0) + 1,
    },
  }));
}

export function removeCommentById(comments: Array<Comment>, id: string): Array<Comment> {
  if (comments.some((comment) => comment.id === id)) {
    return comments.filter((comment) => comment.id !== id);
  }
  let changed = false;
  const next = comments.map((comment) => {
    const replies = comment.replies ?? [];
    const nextReplies = removeCommentById(replies, id);
    if (nextReplies === replies) return comment;
    changed = true;
    const removedDirectChild = nextReplies.length === replies.length - 1;
    if (!removedDirectChild || !comment.replyPagination) {
      return { ...comment, replies: nextReplies };
    }
    return {
      ...comment,
      replies: nextReplies,
      replyPagination: {
        ...comment.replyPagination,
        count: Math.max(0, comment.replyPagination.count - 1),
      },
    };
  });
  return changed ? next : comments;
}
