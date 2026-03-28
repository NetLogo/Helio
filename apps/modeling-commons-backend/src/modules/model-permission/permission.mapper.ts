import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { ModelPermissionEntity } from '#src/modules/model-permission/domain/permission.types.ts';
import type { PermissionResponseDto } from '#src/modules/model-permission/dtos/permission.response.dto.ts';

export type PermissionRecord = {
  id: string;
  modelId: string;
  granteeUserId: string;
  permissionLevel: string;
  createdAt: Date;
};

export default function permissionMapper(): Mapper<
  ModelPermissionEntity,
  PermissionRecord,
  PermissionResponseDto
> {
  return {
    toDomain(record: PermissionRecord): ModelPermissionEntity {
      return {
        id: record.id,
        modelId: record.modelId,
        granteeUserId: record.granteeUserId,
        permissionLevel: record.permissionLevel as ModelPermissionEntity['permissionLevel'],
        createdAt: new Date(record.createdAt),
      };
    },

    toResponse(entity: ModelPermissionEntity): PermissionResponseDto {
      return {
        id: entity.id,
        modelId: entity.modelId,
        granteeUserId: entity.granteeUserId,
        permissionLevel: entity.permissionLevel,
        createdAt: entity.createdAt.toISOString(),
      };
    },

    toPersistence(entity: ModelPermissionEntity): PermissionRecord {
      return {
        id: entity.id,
        modelId: entity.modelId,
        granteeUserId: entity.granteeUserId,
        permissionLevel: entity.permissionLevel,
        createdAt: entity.createdAt,
      };
    },
  };
}
