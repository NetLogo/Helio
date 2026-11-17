import type { Model } from '#prisma/index';
import type { ModelSearchFilters } from '#src/modules/model/domain/model.types.ts';
import { paginatedQueryBase } from '#src/shared/ddd/query.base.ts';
import type { Paginated } from '#src/shared/db/repository.port.ts';

export default function makeSearchModelsQuery({ modelRepository, modelMapper }: Dependencies) {
  return {
    async execute(
      filters: ModelSearchFilters,
      query: { limit?: number; page?: number },
      userId: string | null,
    ): Promise<Paginated<Model>> {
      const params = paginatedQueryBase(query);
      return modelRepository.search(filters, params, userId, {
        map: (r) => modelMapper.toDomain(r),
      });
    },
  };
}
