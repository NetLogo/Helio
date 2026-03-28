import { Type, type Static } from 'typebox';

export const permissionParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});
export type PermissionParams = Static<typeof permissionParamsSchema>;

export const permissionGranteeParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  granteeUserId: Type.String({ format: 'uuid' }),
});
export type PermissionGranteeParams = Static<typeof permissionGranteeParamsSchema>;

export const grantPermissionRequestDtoSchema = Type.Object({
  granteeUserId: Type.String({ format: 'uuid', description: 'User to grant permission to' }),
  permissionLevel: Type.Union(
    [Type.Literal('read'), Type.Literal('write'), Type.Literal('admin')],
    { description: 'Permission level to grant' },
  ),
});
export type GrantPermissionRequestDto = Static<typeof grantPermissionRequestDtoSchema>;
