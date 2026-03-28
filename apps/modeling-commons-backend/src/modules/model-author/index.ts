import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { ModelAuthorEntity } from '#src/modules/model-author/domain/model-author.types.ts';
import type { ModelAuthorRecord } from '#src/modules/model-author/model-author.mapper.ts';
import type { ModelAuthorResponseDto } from '#src/modules/model-author/dtos/model-author.response.dto.ts';
import type { ModelAuthorRepository } from '#src/modules/model-author/database/model-author.repository.port.ts';
import type modelAuthorDomain from '#src/modules/model-author/domain/model-author.domain.ts';

declare global {
  export interface Dependencies {
    modelAuthorMapper: Mapper<ModelAuthorEntity, ModelAuthorRecord, ModelAuthorResponseDto>;
    modelAuthorRepository: ModelAuthorRepository;
    modelAuthorDomain: ReturnType<typeof modelAuthorDomain>;
    modelAuthorService: ReturnType<
      typeof import('#src/modules/model-author/model-author.service.ts').default
    >;
    listAuthorsQuery: ReturnType<
      typeof import('#src/modules/model-author/queries/list-authors.query.ts').default
    >;
    listUserModelsQuery: ReturnType<
      typeof import('#src/modules/model-author/queries/list-user-models.query.ts').default
    >;
  }
}
