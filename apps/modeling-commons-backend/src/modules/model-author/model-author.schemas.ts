import { Type, type Static } from 'typebox';
import { paginatedQueryRequestDtoSchema } from '#src/shared/api/paginated-query.request.dto.ts';

export const modelAuthorParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});
export type ModelAuthorParams = Static<typeof modelAuthorParamsSchema>;

export const modelAuthorUserParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  userId: Type.String({ format: 'uuid' }),
});
export type ModelAuthorUserParams = Static<typeof modelAuthorUserParamsSchema>;

export const addContributorRequestDtoSchema = Type.Object({
  userId: Type.String({ format: 'uuid', description: 'User to add as contributor' }),
});
export type AddContributorRequestDto = Static<typeof addContributorRequestDtoSchema>;

export const transferOwnershipRequestDtoSchema = Type.Object({
  newOwnerId: Type.String({ format: 'uuid', description: 'New owner user id' }),
});
export type TransferOwnershipRequestDto = Static<typeof transferOwnershipRequestDtoSchema>;

export const userIdParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});
export type UserIdParams = Static<typeof userIdParamsSchema>;

export const userModelsQuerySchema = paginatedQueryRequestDtoSchema;
export type UserModelsQuery = Static<typeof userModelsQuerySchema>;
