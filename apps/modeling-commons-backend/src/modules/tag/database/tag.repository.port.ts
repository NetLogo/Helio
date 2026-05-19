import type { TagEntity } from '#src/modules/tag/domain/tag.types.ts';
import type {
  Paginated,
  PaginatedQueryParams,
  RepositoryPort,
} from '#src/shared/db/repository.port.ts';
import type { DateRangeQueryParams } from '#src/shared/db/date-range-query.args.ts';

export interface PopularTag {
  tag: TagEntity;
  modelCount: number;
}

export interface TagRepository extends RepositoryPort<TagEntity> {
  findByNameInsensitive: (name: string) => Promise<TagEntity | undefined>;
  findByPrefix: (prefix: string, params: PaginatedQueryParams) => Promise<Paginated<TagEntity>>;
  upsertByName: (entity: TagEntity) => Promise<TagEntity>;
  findPopularWithCounts: (
    params: PaginatedQueryParams & DateRangeQueryParams,
  ) => Promise<Paginated<PopularTag>>;
}
