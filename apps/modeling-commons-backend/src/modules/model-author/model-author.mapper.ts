import type { ModelAuthor } from '#prisma/index';
import type { ModelAuthorResponseDto } from '#src/modules/model-author/dtos/model-author.response.dto.ts';
import { createReadOnlyMapper } from '#src/shared/ddd/create-mapper.ts';

export type ModelAuthorRecord = ModelAuthor;

export default function modelAuthorMapper() {
  return createReadOnlyMapper<ModelAuthor, ModelAuthorResponseDto>({
    toResponse: (record) => ({
      modelId: record.modelId,
      userId: record.userId,
      role: record.role,
      createdAt: record.createdAt.toISOString(),
    }),
  });
}
