import { Type, type Static } from 'typebox';
import { idSchema } from '#src/shared/utils/id.ts';
import { paginatedQueryRequestDtoSchema } from '#src/shared/api/paginated-query.request.dto.ts';

export const modelAuthorParamsSchema = Type.Object({
  id: idSchema(),
});
export type ModelAuthorParams = Static<typeof modelAuthorParamsSchema>;

export const modelAuthorUserParamsSchema = Type.Object({
  id: idSchema(),
  userId: idSchema(),
});
export type ModelAuthorUserParams = Static<typeof modelAuthorUserParamsSchema>;

export const addContributorRequestDtoSchema = Type.Object({
  userId: idSchema('User to add as contributor'),
});
export type AddContributorRequestDto = Static<typeof addContributorRequestDtoSchema>;

export const transferOwnershipRequestDtoSchema = Type.Object({
  newOwnerId: idSchema('New owner user id'),
});
export type TransferOwnershipRequestDto = Static<typeof transferOwnershipRequestDtoSchema>;

export const userIdParamsSchema = Type.Object({
  id: idSchema(),
});
export type UserIdParams = Static<typeof userIdParamsSchema>;

export const userModelsQuerySchema = paginatedQueryRequestDtoSchema;
export type UserModelsQuery = Static<typeof userModelsQuerySchema>;
