import type { ModelComment } from '#prisma/index';

export type ModelCommentAuthor = {
  id: string;
  name: string | null;
  image: string | null;
};

// `user`/`likedByMe` are populated by the repository's read paths (a hydrated
// include + a viewer-correlated like count); writes and mutation helpers
// operate on the bare `ModelComment` fields and leave them undefined.
export type ModelCommentEntity = ModelComment & {
  user?: ModelCommentAuthor | null;
  likedByMe?: boolean;
};

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
