import type { ModelVersionEntity } from '#src/modules/model-version/domain/model-version.types.ts';
import { paginatedQueryBase } from '#src/shared/ddd/query.base.ts';
import type { Paginated } from '#src/shared/db/repository.port.ts';

export default function makeListVersionsQuery({ modelVersionRepository }: Dependencies) {
  return {
    async execute(
      modelId: string,
      query: { limit?: number; page?: number },
    ): Promise<Paginated<ModelVersionEntity>> {
      const params = paginatedQueryBase(query);
      return modelVersionRepository.listByModel(modelId, params);
    },
  };
}
