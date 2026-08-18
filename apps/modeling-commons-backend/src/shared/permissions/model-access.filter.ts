import type { Prisma } from '#prisma/index';
import { viewerIsActive, viewerIsGlobalAdmin } from './model-access.policy.ts';
import type { ViewerContext } from './model-access.types.ts';

/**
 * `canRead` expressed as a query filter.
 *
 * Every permission level satisfies `read` (`meetsLevel(level, 'read')` is true
 * for read, write and admin), so holding any grant at all is enough here.
 */
export function readableModelFilter(viewer: ViewerContext | null): Prisma.ModelWhereInput {
  // A banned or soft-deleted viewer reads nothing, not even public models.
  if (viewer !== null && !viewerIsActive(viewer)) return { id: { in: [] } };

  if (viewerIsGlobalAdmin(viewer)) return {};

  const live: Array<Prisma.ModelWhereInput> = [{ visibility: { in: ['public', 'unlisted'] } }];
  const branches: Array<Prisma.ModelWhereInput> = [];

  if (viewerIsActive(viewer)) {
    live.push({ authors: { some: { userId: viewer.id, role: { in: ['owner', 'contributor'] } } } });
    live.push({ permissions: { some: { granteeUserId: viewer.id } } });

    // A soft-deleted model stays visible to its owner, matching `canRead`.
    branches.push({
      deletedAt: { not: null },
      authors: { some: { userId: viewer.id, role: 'owner' } },
    });
  }

  branches.unshift({ deletedAt: null, OR: live });

  return { OR: branches };
}
