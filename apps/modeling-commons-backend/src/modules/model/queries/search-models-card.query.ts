import type { ModelSearchFilters } from '#src/modules/model/dtos/model.dto.ts';
import { paginatedQueryBase } from '#src/shared/ddd/query.base.ts';
import type { Paginated } from '#src/shared/db/repository.port.ts';
import { modelCardArgs, type ModelCardRecord } from '../database/model.card.record.ts';

export default function makeSearchModelsQuery({
  modelRepository,
  getModelCardQuery,
}: Dependencies) {
  return {
    async execute(
      filters: ModelSearchFilters,
      query: { limit?: number; page?: number },
      userId: string | null,
    ): Promise<Paginated<ModelCardRecord>> {
      const params = paginatedQueryBase(query);
      return await modelRepository.search(filters, params, userId, {
        include: modelCardArgs.include,
        map: (r) => getModelCardQuery.toDomain(r),
      });
    },
  };
}
