import type { ModelVersionTagEntity } from '#src/modules/model-version-tag/domain/model-version-tag.types.ts';
import { VersionNotFoundError } from '#src/modules/model-version/domain/model-version.errors.ts';

export default function makeListTagsByVersionQuery({
  modelVersionTagService,
  modelVersionRepository,
}: Dependencies) {
  return {
    async execute(modelId: string, versionNumber: number): Promise<ModelVersionTagEntity[]> {
      const version = await modelVersionRepository.findByModelAndVersion(modelId, versionNumber);
      if (!version) throw new VersionNotFoundError(modelId, versionNumber);
      return modelVersionTagService.listByVersion(version.id);
    },
  };
}
