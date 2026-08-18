import type { Model } from '#prisma/index';
import type { CreateModelProps } from '#src/modules/model/dtos/model.dto.ts';
import { ModelAlreadyDeletedError } from '#src/modules/model/domain/model.errors.ts';
import { newId } from '#src/shared/utils/id.ts';

export default function modelDomain() {
  return {
    createModel(props: CreateModelProps): Model {
      const now = new Date();
      return {
        id: newId(),
        latestVersionNumber: null,
        parentModelId: props.parentModelId ?? null,
        parentVersionNumber: props.parentVersionNumber ?? null,
        visibility: props.visibility ?? 'public',
        isEndorsed: false,
        isLibraryModel: false,
        viewCount: 0,
        runCount: 0,
        downloadCount: 0,
        shareCount: 0,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        legacyId: null,
      };
    },

    assertNotDeleted(model: Model): void {
      if (model.deletedAt) {
        throw new ModelAlreadyDeletedError(model.id);
      }
    },
  };
}
