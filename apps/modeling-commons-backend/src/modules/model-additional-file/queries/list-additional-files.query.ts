import type { ModelAdditionalFileEntity } from '#src/modules/model-additional-file/domain/model-additional-file.types.ts';

export default function makeListAdditionalFilesQuery({
  modelAdditionalFileService,
}: Dependencies) {
  return {
    async execute(
      modelId: string,
      taggedVersionId?: string,
    ): Promise<ModelAdditionalFileEntity[]> {
      return modelAdditionalFileService.listByModel(modelId, taggedVersionId);
    },
  };
}
