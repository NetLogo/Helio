import type { ModelRepository } from '#src/modules/model/database/model.repository.port.ts';
import type modelDomain from '#src/modules/model/domain/model.domain.ts';
import type { ModelMapper } from '#src/modules/model/model.mapper.ts';

declare global {
  export interface Dependencies {
    modelMapper: ModelMapper;
    modelRepository: ModelRepository;
    modelDomain: ReturnType<typeof modelDomain>;
    modelService: ReturnType<typeof import('#src/modules/model/model.service.ts').default>;
    searchModelsQuery: ReturnType<
      typeof import('#src/modules/model/queries/search-models.query.ts').default
    >;
    searchModelsCardQuery: ReturnType<
      typeof import('#src/modules/model/queries/search-models-card.query.ts').default
    >;
    getModelChildrenQuery: ReturnType<
      typeof import('#src/modules/model/queries/get-model-children.query.ts').default
    >;
    getModelCardQuery: ReturnType<
      typeof import('#src/modules/model/queries/get-model-card.query.ts').default
    >;
    getModelFamilyCardQuery: ReturnType<
      typeof import('#src/modules/model/queries/get-model-family-card.query.ts').default
    >;
  }
}
