import { Type, type Static } from 'typebox';

export const modelCommentParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});
export type ModelCommentParams = Static<typeof modelCommentParamsSchema>;

export const modelCommentDetailParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  commentId: Type.String({ format: 'uuid' }),
});
export type ModelCommentDetailParams = Static<typeof modelCommentDetailParamsSchema>;
