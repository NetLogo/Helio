import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { ModelAdditionalFileEntity } from '#src/modules/model-additional-file/domain/model-additional-file.types.ts';
import type { ModelAdditionalFileRecord } from '#src/modules/model-additional-file/model-additional-file.mapper.ts';
import type { ModelAdditionalFileResponseDto } from '#src/modules/model-additional-file/dtos/model-additional-file.response.dto.ts';
import type { ModelAdditionalFileRepository } from '#src/modules/model-additional-file/database/model-additional-file.repository.port.ts';
import type modelAdditionalFileDomain from '#src/modules/model-additional-file/domain/model-additional-file.domain.ts';

declare global {
  export interface Dependencies {
    modelAdditionalFileMapper: Mapper<
      ModelAdditionalFileEntity,
      ModelAdditionalFileRecord,
      ModelAdditionalFileResponseDto
    >;
    modelAdditionalFileRepository: ModelAdditionalFileRepository;
    modelAdditionalFileDomain: ReturnType<typeof modelAdditionalFileDomain>;
    modelAdditionalFileService: ReturnType<
      typeof import('#src/modules/model-additional-file/model-additional-file.service.ts').default
    >;
    listAdditionalFilesQuery: ReturnType<
      typeof import('#src/modules/model-additional-file/queries/list-additional-files.query.ts').default
    >;
  }
}
