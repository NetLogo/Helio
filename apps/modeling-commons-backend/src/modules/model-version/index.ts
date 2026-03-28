import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { ModelVersionEntity } from '#src/modules/model-version/domain/model-version.types.ts';
import type { ModelVersionRecord } from '#src/modules/model-version/model-version.mapper.ts';
import type { ModelVersionResponseDto } from '#src/modules/model-version/dtos/model-version.response.dto.ts';
import type { ModelVersionRepository } from '#src/modules/model-version/database/model-version.repository.port.ts';
import type modelVersionDomain from '#src/modules/model-version/domain/model-version.domain.ts';

declare global {
  export interface Dependencies {
    modelVersionMapper: Mapper<ModelVersionEntity, ModelVersionRecord, ModelVersionResponseDto>;
    modelVersionRepository: ModelVersionRepository;
    modelVersionDomain: ReturnType<typeof modelVersionDomain>;
    modelVersionService: ReturnType<
      typeof import('#src/modules/model-version/model-version.service.ts').default
    >;
    listVersionsQuery: ReturnType<
      typeof import('#src/modules/model-version/queries/list-versions.query.ts').default
    >;
    getVersionQuery: ReturnType<
      typeof import('#src/modules/model-version/queries/get-version.query.ts').default
    >;
  }
}
