import { VersionNotFoundError } from '#src/modules/model-version/domain/model-version.errors.ts';
import type { ModelVersionCardResponseDto } from '#src/modules/model-version/dtos/model-version.card.dto.ts';

export default function makeGetVersionCardQuery({
  db,
  modelMapper,
  modelVersionMapper,
  tagMapper,
  fileService,
}: Dependencies) {
  return {
    async execute(modelId: string, versionNumber: number): Promise<ModelVersionCardResponseDto> {
      const record = await db.modelVersion.findUnique({
        where: { modelId_versionNumber: { modelId, versionNumber } },
        include: {
          model: true,
          tags: { include: { tag: true } },
        },
      });
      if (!record) throw new VersionNotFoundError(modelId, versionNumber);

      const { model, tags, ...version } = record;
      const netlogoFileDownloadUrl = await fileService.getUrl(version.netlogoFileKey);
      const previewImageUrl = version.previewImageFileKey
        ? await fileService.getUrl(version.previewImageFileKey)
        : null;

      return {
        version: modelVersionMapper.toResponse(version),
        model: modelMapper.toResponse(model),
        tags: tags.map(({ tag }) => tagMapper.toResponse(tag)),
        netlogoFileDownloadUrl,
        previewImageUrl,
      };
    },
  };
}
