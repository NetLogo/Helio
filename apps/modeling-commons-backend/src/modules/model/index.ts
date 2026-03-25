import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { ModelEntity } from '#src/modules/model/domain/model.types.ts';
import type { ModelRecord } from '#src/modules/model/model.mapper.ts';
import type { ModelResponseDto } from '#src/modules/model/dtos/model.response.dto.ts';
import type { ModelRepository } from '#src/modules/model/database/model.repository.port.ts';
import type modelDomain from '#src/modules/model/domain/model.domain.ts';

declare global {
  export interface Dependencies {
    modelMapper: Mapper<ModelEntity, ModelRecord, ModelResponseDto>;
    modelRepository: ModelRepository;
    modelDomain: ReturnType<typeof modelDomain>;
    modelService: ReturnType<typeof import('#src/modules/model/model.service.ts').default>;
    searchModelsQuery: ReturnType<
      typeof import('#src/modules/model/queries/search-models.query.ts').default
    >;
    getModelChildrenQuery: ReturnType<
      typeof import('#src/modules/model/queries/get-model-children.query.ts').default
    >;
  }
}
