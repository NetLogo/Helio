import { Type, type Static } from 'typebox';

export const updateCommentRequestDtoSchema = Type.Object({
  content: Type.String(),
});

export type UpdateCommentRequestDto = Static<typeof updateCommentRequestDtoSchema>;
