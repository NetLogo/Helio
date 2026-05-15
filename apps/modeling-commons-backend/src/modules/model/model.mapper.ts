import type { Model } from '#prisma/index';
import { resolveActions } from '#src/shared/permissions/model-access.actions.ts';
import type { PolicyContext } from '#src/shared/permissions/model-access.types.ts';
import { applyGlobalResponseFormat } from '#src/shared/ddd/create-mapper.ts';
import type {
  ModelListItemResponseDto,
  ModelResponseDto,
} from './dtos/model.dto.ts';

export type ModelMapper = {
  toDomain(record: Model): Model;
  toPersistence(entity: Model): Model;
  toListItem(entity: Model): ModelListItemResponseDto;
  toResponse(entity: Model, ctx: PolicyContext): ModelResponseDto;
};

export default function modelMapper(): ModelMapper {
  function stripDeletedAt(entity: Model): ModelListItemResponseDto {
    const { deletedAt: _deletedAt, ...rest } = entity;
    return applyGlobalResponseFormat(rest) as ModelListItemResponseDto;
  }

  return {
    toDomain: (record) => record,
    toPersistence: (entity) => entity,
    toListItem: stripDeletedAt,
    toResponse: (entity, ctx) => ({
      ...stripDeletedAt(entity),
      permissions: resolveActions(ctx),
    }),
  };
}
