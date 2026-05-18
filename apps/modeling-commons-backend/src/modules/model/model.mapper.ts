import type { Model } from '#prisma/index';
import { applyGlobalResponseFormat } from '#src/shared/ddd/create-mapper.ts';
import type { ModelResponseDto } from './dtos/model.dto.ts';

export type ModelMapper = {
  toDomain(record: Model): Model;
  toPersistence(entity: Model): Model;
  toResponse(entity: Model): ModelResponseDto;
};

export default function modelMapper(): ModelMapper {
  return {
    toDomain: (record) => record,
    toPersistence: (entity) => entity,
    toResponse: (entity) => {
      const { deletedAt: _deletedAt, ...rest } = entity;
      return applyGlobalResponseFormat(rest) as ModelResponseDto;
    },
  };
}
