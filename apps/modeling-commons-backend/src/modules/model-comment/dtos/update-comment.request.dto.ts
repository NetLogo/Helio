import { Type, type Static } from 'typebox';
import rules from '#src/config/rules.ts';

const CONTENT_LENGTH = rules.limits.comment.content;

export const updateCommentRequestDtoSchema = Type.Object({
  content: Type.String({
    minLength: CONTENT_LENGTH.min,
    maxLength: CONTENT_LENGTH.max,
  }),
});

export type UpdateCommentRequestDto = Static<typeof updateCommentRequestDtoSchema>;
