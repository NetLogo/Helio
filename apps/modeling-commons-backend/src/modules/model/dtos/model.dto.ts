import { Type, type Static } from 'typebox';
import { baseResponseDtoSchema } from '#src/shared/api/response.base.ts';
import { paginatedResponseBaseSchema } from '#src/shared/api/paginated.response.base.ts';
import { paginatedQueryRequestDtoSchema } from '#src/shared/api/paginated-query.request.dto.ts';
import { visibilitySchema } from '#src/modules/model/shared/enums.ts';

export const createModelRequestDtoSchema = Type.Object({
  title: Type.String({
    description: 'Model title',
    minLength: 1,
    maxLength: 255,
  }),
  description: Type.Optional(Type.String({ description: 'Model description', maxLength: 10000 })),
  visibility: Type.Optional(visibilitySchema),
  parentModelId: Type.Optional(Type.String({ format: 'uuid' })),
  parentVersionNumber: Type.Optional(Type.Integer({ minimum: 1 })),
});

export const updateModelRequestDtoSchema = Type.Object({
  visibility: Type.Optional(visibilitySchema),
  isEndorsed: Type.Optional(Type.Boolean()),
});

export const modelIdParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const modelVersionParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  version: Type.Integer({ minimum: 1 }),
});

export const modelSearchQuerySchema = Type.Intersect([
  paginatedQueryRequestDtoSchema,
  Type.Object({
    tag: Type.Optional(Type.String()),
    authorId: Type.Optional(Type.String({ format: 'uuid' })),
    parentModelId: Type.Optional(Type.String({ format: 'uuid' })),
    isEndorsed: Type.Optional(Type.Boolean()),
    keyword: Type.Optional(Type.String()),
  }),
]);

export const modelResponseDtoSchema = Type.Intersect([
  baseResponseDtoSchema,
  Type.Object({
    latestVersionNumber: Type.Union([Type.Integer(), Type.Null()]),
    parentModelId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
    parentVersionNumber: Type.Union([Type.Integer(), Type.Null()]),
    visibility: visibilitySchema,
    isEndorsed: Type.Boolean(),
  }),
]);

export const modelPaginatedResponseSchema = Type.Intersect([
  paginatedResponseBaseSchema,
  Type.Object({
    data: Type.Array(modelResponseDtoSchema),
  }),
]);

export type ModelIdParams = Static<typeof modelIdParamsSchema>;
export type ModelVersionParams = Static<typeof modelVersionParamsSchema>;
export type ModelSearchQuery = Static<typeof modelSearchQuerySchema>;
export type CreateModelRequestDto = Static<typeof createModelRequestDtoSchema>;
export type UpdateModelRequestDto = Static<typeof updateModelRequestDtoSchema>;
export type ModelResponseDto = Static<typeof modelResponseDtoSchema>;

export type CreateModelProps = CreateModelRequestDto;
export type CreateModelResult = {
  id: string;
  versionNumber: number;
};
export type UpdateModelProps = UpdateModelRequestDto;
export type ModelSearchFilters = Omit<ModelSearchQuery, 'limit' | 'page'>;
