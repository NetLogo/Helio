import type {
  ModelPermissionEntity,
  PermissionLevel,
} from '#src/modules/model-permission/domain/permission.types.ts';
import { newId } from '#src/shared/utils/id.ts';

export default function permissionDomain() {
  return {
    createPermission(
      modelId: string,
      granteeUserId: string,
      permissionLevel: PermissionLevel,
    ): ModelPermissionEntity {
      return {
        id: newId(),
        modelId,
        granteeUserId,
        permissionLevel,
        createdAt: new Date(),
      };
    },
  };
}
