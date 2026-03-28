import { Type, type Static } from 'typebox';
import { paginatedQueryRequestDtoSchema } from '#src/shared/api/paginated-query.request.dto.ts';

export const createModelRequestDtoSchema = Type.Object({
  title: Type.String({
    description: 'Model title',
    minLength: 1,
    maxLength: 255,
  }),
  description: Type.Optional(Type.String({ description: 'Model description', maxLength: 10000 })),
  visibility: Type.Optional(
    Type.Union([Type.Literal('public'), Type.Literal('private'), Type.Literal('unlisted')]),
  ),
  parentModelId: Type.Optional(Type.String({ format: 'uuid' })),
  parentVersionId: Type.Optional(Type.String({ format: 'uuid' })),
});
export type CreateModelRequestDto = Static<typeof createModelRequestDtoSchema>;

export const updateModelRequestDtoSchema = Type.Object({
  visibility: Type.Optional(
    Type.Union([Type.Literal('public'), Type.Literal('private'), Type.Literal('unlisted')]),
  ),
  isEndorsed: Type.Optional(Type.Boolean()),
});
export type UpdateModelRequestDto = Static<typeof updateModelRequestDtoSchema>;

export const modelIdParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});
export type ModelIdParams = Static<typeof modelIdParamsSchema>;

export const modelVersionParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  version: Type.Integer({ minimum: 1 }),
});
export type ModelVersionParams = Static<typeof modelVersionParamsSchema>;

export const modelSearchQuerySchema = Type.Intersect([
  paginatedQueryRequestDtoSchema,
  Type.Object({
    visibility: Type.Optional(Type.String()),
    tag: Type.Optional(Type.String()),
    authorId: Type.Optional(Type.String({ format: 'uuid' })),
    parentModelId: Type.Optional(Type.String({ format: 'uuid' })),
    isEndorsed: Type.Optional(Type.Boolean()),
    keyword: Type.Optional(Type.String()),
  }),
]);
export type ModelSearchQuery = Static<typeof modelSearchQuerySchema>;
