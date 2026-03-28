import type { ModelEntity } from '#src/modules/model/domain/model.types.ts';
import { paginatedQueryBase } from '#src/shared/ddd/query.base.ts';
import type { Paginated } from '#src/shared/db/repository.port.ts';

export default function makeGetModelChildrenQuery({ modelRepository }: Dependencies) {
  return {
    async execute(
      modelId: string,
      query: { limit?: number; page?: number },
    ): Promise<Paginated<ModelEntity>> {
      const params = paginatedQueryBase(query);
      return modelRepository.findChildren(modelId, params);
    },
  };
}
