import type { ModelAuthorEntity } from '#src/modules/model-author/domain/model-author.types.ts';
import { paginatedQueryBase } from '#src/shared/ddd/query.base.ts';
import type { Paginated } from '#src/shared/db/repository.port.ts';
import { loadViewer } from '#src/shared/permissions/model-access.viewer.ts';

export default function makeListUserModelsQuery({ modelAuthorRepository, db }: Dependencies) {
  return {
    async execute(
      userId: string,
      query: { limit?: number; page?: number },
      viewerId: string | null,
    ): Promise<Paginated<ModelAuthorEntity>> {
      const params = paginatedQueryBase(query);
      const viewer = await loadViewer(db, viewerId);
      return modelAuthorRepository.findModelsByUser(userId, params, viewer);
    },
  };
}
