import { Type, type Static } from 'typebox';
import { paginatedQueryRequestDtoSchema } from '#src/shared/api/paginated-query.request.dto.ts';

export const createVersionRequestDtoSchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  description: Type.Optional(Type.String({ maxLength: 10000 })),
});
export type CreateVersionRequestDto = Static<typeof createVersionRequestDtoSchema>;

export const updateCurrentVersionRequestDtoSchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  description: Type.Optional(Type.String({ maxLength: 10000 })),
});
export type UpdateCurrentVersionRequestDto = Static<typeof updateCurrentVersionRequestDtoSchema>;

export const versionParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  version: Type.Integer({ minimum: 1 }),
});
export type VersionParams = Static<typeof versionParamsSchema>;

export const versionListQuerySchema = Type.Intersect([
  paginatedQueryRequestDtoSchema,
  Type.Object({
    id: Type.Optional(Type.String({ format: 'uuid' })),
  }),
]);
