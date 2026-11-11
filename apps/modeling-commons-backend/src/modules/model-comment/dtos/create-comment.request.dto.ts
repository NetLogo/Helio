import { Type, type Static } from 'typebox';
import { idSchema } from '#src/shared/utils/id.ts';

export const createCommentRequestDtoSchema = Type.Object({
  content: Type.String(),
  parentId: Type.Optional(idSchema()),
  versionNumber: Type.Optional(Type.Integer({ minimum: 1 })),
});

export type CreateCommentRequestDto = Static<typeof createCommentRequestDtoSchema>;
