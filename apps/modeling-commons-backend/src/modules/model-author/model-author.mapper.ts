import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type {
  ModelAuthorEntity,
  AuthorRole,
} from '#src/modules/model-author/domain/model-author.types.ts';
import type { ModelAuthorResponseDto } from '#src/modules/model-author/dtos/model-author.response.dto.ts';

export type ModelAuthorRecord = {
  modelId: string;
  userId: string;
  role: AuthorRole;
  createdAt: Date;
};

export default function modelAuthorMapper(): Mapper<
  ModelAuthorEntity,
  ModelAuthorRecord,
  ModelAuthorResponseDto
> {
  return {
    toDomain(record: ModelAuthorRecord): ModelAuthorEntity {
      return {
        modelId: record.modelId,
        userId: record.userId,
        role: record.role,
        createdAt: new Date(record.createdAt),
      };
    },

    toResponse(entity: ModelAuthorEntity): ModelAuthorResponseDto {
      return {
        modelId: entity.modelId,
        userId: entity.userId,
        role: entity.role,
        createdAt: entity.createdAt.toISOString(),
      };
    },

    toPersistence(entity: ModelAuthorEntity): ModelAuthorRecord {
      return {
        modelId: entity.modelId,
        userId: entity.userId,
        role: entity.role,
        createdAt: entity.createdAt,
      };
    },
  };
}
