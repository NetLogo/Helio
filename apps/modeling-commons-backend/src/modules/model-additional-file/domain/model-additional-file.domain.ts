import type {
  AddAdditionalFileProps,
  ModelAdditionalFileEntity,
} from '#src/modules/model-additional-file/domain/model-additional-file.types.ts';
import { newId } from '#src/shared/utils/id.ts';

export default function modelAdditionalFileDomain() {
  return {
    createAdditionalFile(props: AddAdditionalFileProps): ModelAdditionalFileEntity {
      return {
        id: newId(),
        modelId: props.modelId,
        taggedVersionNumber: props.taggedVersionNumber,
        fileKey: props.fileKey,
        kind: props.kind ?? 'additional',
        createdAt: new Date(),
      };
    },
  };
}
