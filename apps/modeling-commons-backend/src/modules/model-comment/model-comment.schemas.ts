import { Type, type Static } from 'typebox';
import { idSchema } from '#src/shared/utils/id.ts';

export const modelCommentParamsSchema = Type.Object({
  id: idSchema(),
});
export type ModelCommentParams = Static<typeof modelCommentParamsSchema>;

export const modelCommentDetailParamsSchema = Type.Object({
  id: idSchema(),
  commentId: idSchema(),
});
export type ModelCommentDetailParams = Static<typeof modelCommentDetailParamsSchema>;
