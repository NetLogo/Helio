import { ModelInteractionKind, type Prisma } from '#prisma/index';
import type { ModelSearchFilters, ModelSortBy } from '#src/modules/model/dtos/model.dto.ts';
import dateRangeQueryArgs from '#src/shared/db/date-range-query.args.ts';
import type { PaginatedQueryParams } from '#src/shared/db/repository.port.ts';

export function buildModelWhere(
  filters: ModelSearchFilters,
  userId: string | null,
): Prisma.ModelWhereInput {
  const conditions: Prisma.ModelWhereInput[] = [{ deletedAt: null }];

  if (userId && !filters.publicOnly) {
    conditions.push({
      OR: [
        { visibility: 'public' },
        {
          visibility: { in: ['private', 'unlisted'] },
          OR: [
            { authors: { some: { userId } } },
            { permissions: { some: { granteeUserId: userId } } },
          ],
        },
      ],
    });
  } else {
    conditions.push({ visibility: 'public' });
  }

  if (filters.parentModelId) conditions.push({ parentModelId: filters.parentModelId });
  if (filters.isEndorsed !== undefined) conditions.push({ isEndorsed: filters.isEndorsed });
  if (filters.isLibraryModel !== undefined)
    conditions.push({ isLibraryModel: filters.isLibraryModel });
  if (filters.authorId)
    conditions.push({
      authors: {
        some: {
          userId: filters.authorId,
          role: filters.authorRoles ? { in: filters.authorRoles } : undefined,
        },
      },
    });

  if (filters.tags && filters.tags.length > 0) {
    conditions.push({
      versions: {
        some: {
          tags: { some: { tag: { name: { in: filters.tags, mode: 'insensitive' } } } },
        },
      },
    });
  }

  if (filters.netlogoVersion) {
    conditions.push({
      versions: { some: { netlogoVersion: filters.netlogoVersion } },
    });
  }

  if (filters.keyword) {
    conditions.push({
      OR: [
        { versions: { some: { title: { contains: filters.keyword, mode: 'insensitive' } } } },
        { versions: { some: { description: { contains: filters.keyword, mode: 'insensitive' } } } },
      ],
    });
  }

  if (filters.fromDate || filters.toDate) {
    conditions.push(dateRangeQueryArgs(filters.fromDate, filters.toDate, 'createdAt'));
  }

  return { AND: conditions };
}

export function buildModelOrderBy(
  filters: ModelSearchFilters,
  params: PaginatedQueryParams,
): Prisma.ModelOrderByWithRelationInput {
  const order = filters.order || params.orderBy?.param || 'desc';
  if (filters.sortBy === 'likes') {
    return { likes: { _count: order } };
  }
  if (params.orderBy) {
    return { [params.orderBy.field]: order };
  }
  return { createdAt: order };
}

export const interactionKindBySortKey: Partial<Record<ModelSortBy, ModelInteractionKind>> = {
  views: ModelInteractionKind.view,
  runs: ModelInteractionKind.run,
  downloads: ModelInteractionKind.download,
};
