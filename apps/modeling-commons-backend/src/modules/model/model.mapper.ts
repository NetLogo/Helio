import type { Model } from '#prisma/index';
import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import { createReadOnlyMapper } from '#src/shared/ddd/create-mapper.ts';
import type { ModelResponseDto } from './dtos/model.dto.ts';

export default function modelMapper(): Mapper<Model, Model, ModelResponseDto> {
  return createReadOnlyMapper<Model, Omit<Model, 'deletedAt'>>({
    toResponse: ({ deletedAt: _deletedAt, ...rest }) => rest,
  });
}
