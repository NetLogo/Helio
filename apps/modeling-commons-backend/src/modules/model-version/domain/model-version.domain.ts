import type { ModelVersionEntity } from '#src/modules/model-version/domain/model-version.types.ts';
import { VersionFinalizedError } from '#src/modules/model-version/domain/model-version.errors.ts';

export default function modelVersionDomain() {
  return {
    createVersion(props: {
      modelId: string;
      versionNumber: number;
      title: string;
      description?: string;
      previewImage?: Buffer<ArrayBuffer>;
      nlogoxFileId: string;
    }): ModelVersionEntity {
      return {
        modelId: props.modelId,
        versionNumber: props.versionNumber,
        title: props.title,
        description: props.description ?? null,
        previewImage: props.previewImage ?? null,
        nlogoxFileId: props.nlogoxFileId,
        netlogoVersion: null,
        infoTab: null,
        createdAt: new Date(),
        finalizedAt: null,
      };
    },

    assertNotFinalized(version: ModelVersionEntity): void {
      if (version.finalizedAt) {
        throw new VersionFinalizedError(version.modelId, version.versionNumber);
      }
    },
  };
}
