import type {
  AddTagProps,
  ModelVersionTagEntity,
} from '#src/modules/model-version-tag/domain/model-version-tag.types.ts';
import type { ModelVersionEntity } from '#src/modules/model-version/domain/model-version.types.ts';
import { CannotModifyFinalizedVersionError } from '#src/modules/model-version-tag/domain/model-version-tag.errors.ts';

export default function modelVersionTagDomain() {
  return {
    createModelVersionTag(props: AddTagProps): ModelVersionTagEntity {
      return {
        modelVersionId: props.modelVersionId,
        tagId: props.tagId,
        createdAt: new Date(),
      };
    },

    assertNotFinalized(version: ModelVersionEntity): void {
      if (version.finalizedAt) {
        throw new CannotModifyFinalizedVersionError(version.id);
      }
    },
  };
}
