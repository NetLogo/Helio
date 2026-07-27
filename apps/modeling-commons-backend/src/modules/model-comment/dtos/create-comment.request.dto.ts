import { Type, type Static } from 'typebox';
import rules from '#src/config/rules.ts';

const CONTENT_LENGTH = rules.limits.comment.content;

export const createCommentRequestDtoSchema = Type.Object({
  content: Type.String({
    minLength: CONTENT_LENGTH.min,
    maxLength: CONTENT_LENGTH.max,
  }),
  parentId: Type.Optional(Type.String({ format: 'uuid' })),
  versionNumber: Type.Optional(Type.Integer({ minimum: 1 })),
});

export type CreateCommentRequestDto = Static<typeof createCommentRequestDtoSchema>;
