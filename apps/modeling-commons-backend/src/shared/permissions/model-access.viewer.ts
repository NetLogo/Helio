import type { ExtendedPrismaClient } from '#src/lib/prisma.ts';
import type { PolicyContext, SystemRole, ViewerContext } from './model-access.types.ts';

export async function loadViewer(
  db: ExtendedPrismaClient,
  userId: string | null,
): Promise<ViewerContext | null> {
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, systemRole: true, banned: true, deletedAt: true },
  });

  if (!user) return null;

  return {
    id: user.id,
    systemRole: user.systemRole as SystemRole,
    banned: user.banned === true,
    deletedAt: user.deletedAt,
  };
}

export async function loadModelAccessContext(
  db: ExtendedPrismaClient,
  userId: string | null,
  modelId: string,
): Promise<PolicyContext> {
  const viewer = await loadViewer(db, userId);

  const sentinelOrUserId = userId ?? '__never__';
  const model = await db.model.findUnique({
    where: { id: modelId },
    select: {
      id: true,
      visibility: true,
      deletedAt: true,
      authors: { where: { userId: sentinelOrUserId }, select: { role: true } },
      permissions: {
        where: { granteeUserId: sentinelOrUserId },
        select: { permissionLevel: true },
      },
    },
  });

  if (!model) throw new Error('Model not found');
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const ownerRole = model.authors.length > 0 ? model.authors[0]!.role : null;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const grantLevel = model.permissions.length > 0 ? model.permissions[0]!.permissionLevel : null;

  return { viewer, model, ownerRole, grantLevel };
}
