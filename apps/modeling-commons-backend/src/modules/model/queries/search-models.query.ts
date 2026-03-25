import type { ModelSearchFilters, ModelEntity } from '#src/modules/model/domain/model.types.ts';
import { paginatedQueryBase } from '#src/shared/ddd/query.base.ts';
import type { Paginated } from '#src/shared/db/repository.port.ts';

export default function makeSearchModelsQuery({ modelRepository }: Dependencies) {
  return {
    async execute(
      filters: ModelSearchFilters,
      query: { limit?: number; page?: number },
      userId: string | null,
    ): Promise<Paginated<ModelEntity>> {
      const params = paginatedQueryBase(query);
      return modelRepository.search(filters, params, userId);
    },
  };
}
