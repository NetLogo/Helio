import type { ModelAuthor } from '#prisma/index';
import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import { createReadOnlyMapper } from '#src/shared/ddd/create-mapper.ts';
import type { ModelAuthorResponseDto } from '#src/modules/model-author/dtos/model-author.response.dto.ts';

export type ModelAuthorRecord = ModelAuthor;

export default function modelAuthorMapper(): Mapper<ModelAuthor, ModelAuthor, ModelAuthorResponseDto> {
  return createReadOnlyMapper<ModelAuthor, ModelAuthor>({
    toResponse: (record) => record,
  });
}
