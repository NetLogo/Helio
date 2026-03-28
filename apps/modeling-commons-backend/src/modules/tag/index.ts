import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { TagEntity } from '#src/modules/tag/domain/tag.types.ts';
import type { TagRecord } from '#src/modules/tag/tag.mapper.ts';
import type { TagResponseDto } from '#src/modules/tag/dtos/tag.response.dto.ts';
import type { TagRepository } from '#src/modules/tag/database/tag.repository.port.ts';
import type tagDomain from '#src/modules/tag/domain/tag.domain.ts';

declare global {
  export interface Dependencies {
    tagMapper: Mapper<TagEntity, TagRecord, TagResponseDto>;
    tagRepository: TagRepository;
    tagDomain: ReturnType<typeof tagDomain>;
    tagService: ReturnType<typeof import('#src/modules/tag/tag.service.ts').default>;
    findTagsByPrefixQuery: ReturnType<
      typeof import('#src/modules/tag/queries/find-tags-by-prefix.query.ts').default
    >;
    findTagQuery: ReturnType<
      typeof import('#src/modules/tag/queries/find-tag.query.ts').default
    >;
  }
}
