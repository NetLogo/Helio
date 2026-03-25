import { Type, type Static } from 'typebox';

export const permissionResponseDtoSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  modelId: Type.String({ format: 'uuid' }),
  granteeUserId: Type.String({ format: 'uuid' }),
  permissionLevel: Type.String({ description: 'read | write | admin' }),
  createdAt: Type.String({
    example: '2020-11-24T17:43:15.970Z',
    description: 'Permission creation date',
  }),
});

export type PermissionResponseDto = Static<typeof permissionResponseDtoSchema>;
