import { meetsLevel } from '#src/modules/model-permission/domain/permission.types.ts';
import type { AccessLevel, PolicyContext, ViewerContext } from './model-access.types.ts';

export function viewerIsActive(viewer: ViewerContext | null): viewer is ViewerContext {
  return viewer !== null && !viewer.banned && viewer.deletedAt === null;
}

export function viewerIsGlobalAdmin(viewer: ViewerContext | null): boolean {
  return viewerIsActive(viewer) && viewer.systemRole === 'admin';
}

export function canRead(ctx: PolicyContext): boolean {
  const { viewer, model, ownerRole, grantLevel } = ctx;

  if (viewer !== null && (viewer.banned || viewer.deletedAt !== null)) return false;

  if (model.deletedAt !== null) {
    if (viewerIsGlobalAdmin(viewer)) return true;
    if (viewerIsActive(viewer) && ownerRole === 'owner') return true;
    return false;
  }

  if (viewerIsGlobalAdmin(viewer)) return true;

  if (model.visibility === 'public' || model.visibility === 'unlisted') return true;

  if (viewerIsActive(viewer)) {
    if (ownerRole === 'owner' || ownerRole === 'contributor') return true;
    if (grantLevel !== null && meetsLevel(grantLevel, 'read')) return true;
  }

  return false;
}

export function canWrite(ctx: PolicyContext): boolean {
  const { viewer, model, ownerRole, grantLevel } = ctx;

  if (!viewerIsActive(viewer)) return false;
  if (model.deletedAt !== null) return false;

  if (viewer.systemRole === 'admin') return true;
  if (ownerRole === 'owner' || ownerRole === 'contributor') return true;
  if (grantLevel !== null && meetsLevel(grantLevel, 'write')) return true;

  return false;
}

export function canAdmin(ctx: PolicyContext): boolean {
  const { viewer, model, ownerRole, grantLevel } = ctx;

  if (!viewerIsActive(viewer)) return false;
  if (model.deletedAt !== null) return false;

  if (viewer.systemRole === 'admin') return true;
  if (ownerRole === 'owner') return true;
  if (grantLevel !== null && meetsLevel(grantLevel, 'admin')) return true;

  return false;
}

export const policy = {
  read: canRead,
  write: canWrite,
  admin: canAdmin,
} as const satisfies Record<AccessLevel, (ctx: PolicyContext) => boolean>;
