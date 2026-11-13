export const modelCommentEventTypes = {
  created: 'model_comment.created',
  updated: 'model_comment.updated',
  deleted: 'model_comment.deleted',
} as const;

export type ModelCommentEventPayloads = {
  [modelCommentEventTypes.created]: { commentId: string; parentId: string | null };
  [modelCommentEventTypes.updated]: { commentId: string };
  [modelCommentEventTypes.deleted]: { commentId: string; byAdmin: boolean };
};
