import { randomUUID } from 'node:crypto';
import type {
  AddAdditionalFileProps,
  ModelAdditionalFileEntity,
} from '#src/modules/model-additional-file/domain/model-additional-file.types.ts';

export default function modelAdditionalFileDomain() {
  return {
    createAdditionalFile(props: AddAdditionalFileProps): ModelAdditionalFileEntity {
      return {
        id: randomUUID(),
        modelId: props.modelId,
        taggedVersionNumber: props.taggedVersionNumber,
        fileKey: props.fileKey,
        kind: props.kind ?? 'additional',
        createdAt: new Date(),
      };
    },
  };
}
