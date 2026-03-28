import { randomUUID } from 'node:crypto';
import type {
  ModelPermissionEntity,
  PermissionLevel,
} from '#src/modules/model-permission/domain/permission.types.ts';

export default function permissionDomain() {
  return {
    createPermission(
      modelId: string,
      granteeUserId: string,
      permissionLevel: PermissionLevel,
    ): ModelPermissionEntity {
      return {
        id: randomUUID(),
        modelId,
        granteeUserId,
        permissionLevel,
        createdAt: new Date(),
      };
    },
  };
}
