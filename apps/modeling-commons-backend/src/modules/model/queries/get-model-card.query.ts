import { ModelNotFoundError } from '#src/modules/model/domain/model.errors.ts';
import type { ModelCardResponseDto } from '#src/modules/model/dtos/model.card.dto.ts';
import { getModelPreviewImageUrl } from '../shared/urls.ts';

export default function makeGetModelCardQuery({
  modelRepository,
  modelMapper,
  modelVersionMapper,
  modelAuthorMapper,
  tagMapper,
  fileService,
  modelInteractionRepository,
  modelLikeRepository,
}: Dependencies) {
  return {
    async execute(modelId: string, viewerUserId: string | null = null): Promise<ModelCardResponseDto> {
      const card = await modelRepository.findCard(modelId);
      if (!card) throw new ModelNotFoundError(modelId);

      const { versions, authors, _count, ...model } = card;
      const [latestWithTags] = versions;
      const latestTags = latestWithTags?.tags ?? [];

      const netlogoFileDownloadUrl = latestWithTags
        ? await fileService.getUrl(latestWithTags.netlogoFileKey)
        : null;
      const previewImageUrl = latestWithTags?.previewImage
        ? getModelPreviewImageUrl(modelId, latestWithTags.versionNumber)
        : null;

      const [interactionCounts, likes, likedByMe] = await Promise.all([
        modelInteractionRepository.countsByKindForModel(modelId),
        modelLikeRepository.countByModel(modelId),
        viewerUserId
          ? modelLikeRepository.existsFor(modelId, viewerUserId)
          : Promise.resolve(false),
      ]);

      return {
        model: modelMapper.toResponse(model),
        latestVersion: latestWithTags
          ? {
              ...modelVersionMapper.toResponse(latestWithTags),
              netlogoFileDownloadUrl,
              previewImageUrl,
            }
          : null,
        authors: authors.map(({ user, ...record }) => ({
          ...modelAuthorMapper.toResponse(record),
          userName: user.name,
          userImage: user.image,
        })),
        tagsOnLatestVersion: latestTags.map(({ tag }) => tagMapper.toResponse(tag)),
        previewImageUrl,
        counts: {
          versions: _count.versions,
          children: _count.childModels,
        },
        stats: {
          likes,
          views: interactionCounts.view,
          runs: interactionCounts.run,
          downloads: interactionCounts.download,
          shares: interactionCounts.share,
          likedByMe,
        },
      };
    },
  };
}
