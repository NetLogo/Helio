import { Type, type Static } from 'typebox';
import { idSchema } from '#src/shared/utils/id.ts';

export const permissionResponseDtoSchema = Type.Object({
  id: idSchema(),
  modelId: idSchema(),
  granteeUserId: idSchema(),
  permissionLevel: Type.String({ description: 'read | write | admin' }),
  createdAt: Type.String({
    example: '2020-11-24T17:43:15.970Z',
    description: 'Permission creation date',
  }),
});

export type PermissionResponseDto = Static<typeof permissionResponseDtoSchema>;
