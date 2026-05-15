import type { ExtendedPrismaClient } from '#src/lib/prisma.ts';
import type { SystemRole, ViewerContext } from './model-access.types.ts';

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
