import type { ModelVersionEntity } from '#src/modules/model-version/domain/model-version.types.ts';
import { VersionNotFoundError } from '#src/modules/model-version/domain/model-version.errors.ts';

export default function makeGetVersionQuery({
  modelVersionRepository,
}: Dependencies) {
  return {
    async execute(modelId: string, versionNumber: number): Promise<ModelVersionEntity> {
      const version = await modelVersionRepository.findByModelAndVersion(
        modelId,
        versionNumber,
      );
      if (!version) throw new VersionNotFoundError(modelId, versionNumber);
      return version;
    },
  };
}
