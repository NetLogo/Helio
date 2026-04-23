import { idDtoSchema } from '#src/shared/api/id.response.dto.ts';
import { Type, type Static } from 'typebox';

export const permissionParamsSchema = idDtoSchema;
export type PermissionParams = Static<typeof permissionParamsSchema>;

export const permissionGranteeParamsSchema = Type.Intersect([
  permissionParamsSchema,
  Type.Object({
    granteeUserId: Type.String({ format: 'uuid' }),
  }),
]);
export type PermissionGranteeParams = Static<typeof permissionGranteeParamsSchema>;

export const grantPermissionRequestDtoSchema = Type.Object({
  granteeUserId: Type.String({ format: 'uuid', description: 'User to grant permission to' }),
  permissionLevel: Type.Union(
    [Type.Literal('read'), Type.Literal('write'), Type.Literal('admin')],
    { description: 'Permission level to grant' },
  ),
});
export type GrantPermissionRequestDto = Static<typeof grantPermissionRequestDtoSchema>;
