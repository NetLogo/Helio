import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { ModelVersionTagEntity } from '#src/modules/model-version-tag/domain/model-version-tag.types.ts';
import type { ModelVersionTagRecord } from '#src/modules/model-version-tag/model-version-tag.mapper.ts';
import type { ModelVersionTagResponseDto } from '#src/modules/model-version-tag/dtos/model-version-tag.response.dto.ts';
import type { ModelVersionTagRepository } from '#src/modules/model-version-tag/database/model-version-tag.repository.port.ts';
import type modelVersionTagDomain from '#src/modules/model-version-tag/domain/model-version-tag.domain.ts';

declare global {
  export interface Dependencies {
    modelVersionTagMapper: Mapper<
      ModelVersionTagEntity,
      ModelVersionTagRecord,
      ModelVersionTagResponseDto
    >;
    modelVersionTagRepository: ModelVersionTagRepository;
    modelVersionTagDomain: ReturnType<typeof modelVersionTagDomain>;
    modelVersionTagService: ReturnType<
      typeof import('#src/modules/model-version-tag/model-version-tag.service.ts').default
    >;
    listTagsByVersionQuery: ReturnType<
      typeof import('#src/modules/model-version-tag/queries/list-tags-by-version.query.ts').default
    >;
  }
}
