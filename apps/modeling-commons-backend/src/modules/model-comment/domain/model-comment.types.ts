import type { ModelComment } from '#prisma/index';

export type ModelCommentEntity = ModelComment;

export type CreateCommentProps = {
  modelId: string;
  userId: string;
  parentId?: string;
  versionNumber?: number;
  content: string;
};

export type CommentAuthCaller = {
  id: string;
  systemRole?: string;
};

// Mirrors the frontend's `maximumNested` / `maximumShownRepliesPerLevel`
// (thread-shape/UX config, not a security bound — see rules.ts for that).
export const COMMENT_TREE_DEFAULTS = {
  maximumNested: 3,
  maximumShownRepliesPerLevel: 2,
};
