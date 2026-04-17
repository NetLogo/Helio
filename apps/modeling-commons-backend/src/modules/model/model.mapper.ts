import type { Model } from '#prisma/index';
import type { ModelResponseDto } from '#src/modules/model/dtos/model.dto.ts';
import { createReadOnlyMapper } from '#src/shared/ddd/create-mapper.ts';

export default function modelMapper() {
  return createReadOnlyMapper<Model, ModelResponseDto>({
    toResponse: ({ deletedAt: _deletedAt, ...rest }) => rest as unknown as ModelResponseDto,
  });
}
