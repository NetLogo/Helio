import type { TagEntity } from '#src/modules/tag/domain/tag.types.ts';
import type { Paginated, PaginatedQueryParams, RepositoryPort } from '#src/shared/db/repository.port.ts';

export interface TagRepository extends RepositoryPort<TagEntity> {
  findByNameInsensitive(name: string): Promise<TagEntity | undefined>;
  findByPrefix(prefix: string, params: PaginatedQueryParams): Promise<Paginated<TagEntity>>;
  upsertByName(entity: TagEntity): Promise<TagEntity>;
}
