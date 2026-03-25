import type { ModelAuthorEntity } from '#src/modules/model-author/domain/model-author.types.ts';
import { paginatedQueryBase } from '#src/shared/ddd/query.base.ts';
import type { Paginated } from '#src/shared/db/repository.port.ts';

export default function makeListUserModelsQuery({ modelAuthorRepository }: Dependencies) {
  return {
    async execute(
      userId: string,
      query: { limit?: number; page?: number },
    ): Promise<Paginated<ModelAuthorEntity>> {
      const params = paginatedQueryBase(query);
      return modelAuthorRepository.findModelsByUser(userId, params);
    },
  };
}
