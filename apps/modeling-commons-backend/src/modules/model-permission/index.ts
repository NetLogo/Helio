import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { ModelPermissionEntity } from '#src/modules/model-permission/domain/permission.types.ts';
import type { PermissionRecord } from '#src/modules/model-permission/permission.mapper.ts';
import type { PermissionResponseDto } from '#src/modules/model-permission/dtos/permission.response.dto.ts';
import type { PermissionRepository } from '#src/modules/model-permission/database/permission.repository.port.ts';
import type permissionDomain from '#src/modules/model-permission/domain/permission.domain.ts';

declare global {
  export interface Dependencies {
    permissionMapper: Mapper<ModelPermissionEntity, PermissionRecord, PermissionResponseDto>;
    permissionRepository: PermissionRepository;
    permissionDomain: ReturnType<typeof permissionDomain>;
    permissionService: ReturnType<
      typeof import('#src/modules/model-permission/permission.service.ts').default
    >;
  }
}
