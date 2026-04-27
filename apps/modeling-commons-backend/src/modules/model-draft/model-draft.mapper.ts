import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import { createReadOnlyMapper } from '#src/shared/ddd/create-mapper.ts';
import type { ModelDraftRecord } from '#src/modules/model-draft/database/model-draft.record.ts';
import type { ModelDraftEntity } from '#src/modules/model-draft/domain/model-draft.types.ts';
import type { ModelDraftResponseDto } from '#src/modules/model-draft/dtos/model-draft.dto.ts';
import { upcast, LATEST_DRAFT_SCHEMA_VERSION } from '#src/modules/model-draft/schemas/index.ts';

export default function modelDraftMapper(): Mapper<
  ModelDraftEntity,
  ModelDraftRecord,
  ModelDraftResponseDto
> {
  return createReadOnlyMapper<
    ModelDraftEntity,
    Omit<ModelDraftEntity, 'data' | 'schemaVersion'> & {
      schemaVersion: number;
      data: ReturnType<typeof upcast>;
    }
  >({
    toResponse: (entity) => ({
      id: entity.id,
      userId: entity.userId,
      modelId: entity.modelId,
      schemaVersion: LATEST_DRAFT_SCHEMA_VERSION,
      data: upcast(entity.data, entity.schemaVersion),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }),
  });
}
