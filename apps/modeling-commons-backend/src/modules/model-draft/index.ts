import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { ModelDraftEntity } from '#src/modules/model-draft/domain/model-draft.types.ts';
import type { ModelDraftRecord } from '#src/modules/model-draft/database/model-draft.record.ts';
import type { ModelDraftResponseDto } from '#src/modules/model-draft/dtos/model-draft.dto.ts';
import type { ModelDraftRepository } from '#src/modules/model-draft/database/model-draft.repository.port.ts';
import type modelDraftDomain from '#src/modules/model-draft/domain/model-draft.domain.ts';

declare global {
  export interface Dependencies {
    modelDraftMapper: Mapper<ModelDraftEntity, ModelDraftRecord, ModelDraftResponseDto>;
    modelDraftRepository: ModelDraftRepository;
    modelDraftDomain: ReturnType<typeof modelDraftDomain>;
    modelDraftService: ReturnType<
      typeof import('#src/modules/model-draft/model-draft.service.ts').default
    >;
  }
}
