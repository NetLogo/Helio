import { ModelNotFoundError } from '#src/modules/model/domain/model.errors.ts';
import type { ModelCardResponseDto } from '#src/modules/model/dtos/model.card.dto.ts';

export default function makeGetModelCardQuery({
  modelRepository,
  modelMapper,
  modelVersionMapper,
  modelAuthorMapper,
  tagMapper,
}: Dependencies) {
  return {
    async execute(modelId: string): Promise<ModelCardResponseDto> {
      const card = await modelRepository.findCard(modelId);
      if (!card) throw new ModelNotFoundError(modelId);

      const { versions, authors, _count, ...model } = card;
      const [latestWithTags] = versions;
      const latestTags = latestWithTags?.tags ?? [];

      return {
        model: modelMapper.toResponse(model),
        latestVersion: latestWithTags ? modelVersionMapper.toResponse(latestWithTags) : null,
        authors: authors.map(({ user, ...record }) => ({
          ...modelAuthorMapper.toResponse(record),
          userName: user.name,
          userImage: user.image,
        })),
        tagsOnLatestVersion: latestTags.map(({ tag }) => tagMapper.toResponse(tag)),
        counts: {
          versions: _count.versions,
          children: _count.childModels,
        },
      };
    },
  };
}
