import { describe, expect, it } from 'vitest';
import { readableModelFilter } from './model-access.filter.ts';
import { canRead } from './model-access.policy.ts';
import type {
  ModelAccessSubject,
  ModelVisibility,
  PolicyContext,
  ViewerContext,
} from './model-access.types.ts';
import type { AuthorRole } from '#src/modules/model-permission/domain/permission.types.ts';
import type { PermissionLevel } from '#src/modules/model-permission/domain/permission.types.ts';

type Row = {
  model: ModelAccessSubject;
  authorRole: AuthorRole | null;
  grant: PermissionLevel | null;
};

function matches(filter: Record<string, any>, row: Row, viewerId: string | null): boolean {
  return Object.entries(filter).every(([key, value]) => {
    switch (key) {
      case 'id':
        return Array.isArray(value?.in) ? value.in.includes(row.model.id) : true;

      case 'OR':
        return (value as Record<string, any>[]).some((f) => matches(f, row, viewerId));

      case 'deletedAt': {
        // `null` means "not deleted"; `{ not: null }` means "deleted".
        const wantsDeleted = value !== null;
        return wantsDeleted === (row.model.deletedAt !== null);
      }

      case 'visibility':
        return value.in.includes(row.model.visibility);

      case 'authors': {
        const some = value.some;
        if (some.userId !== viewerId) return false;
        if (row.authorRole === null) return false;
        const wanted: AuthorRole[] | null = some.role?.in ?? (some.role ? [some.role] : null);
        return wanted === null || wanted.includes(row.authorRole);
      }

      case 'permissions':
        return value.some.granteeUserId === viewerId && row.grant !== null;

      default:
        return true;
    }
  });
}

const viewers: Record<string, ViewerContext | null> = {
  anonymous: null,
  active: { id: 'viewer', systemRole: 'user', banned: false, deletedAt: null },
  admin: { id: 'viewer', systemRole: 'admin', banned: false, deletedAt: null },
  banned: { id: 'viewer', systemRole: 'user', banned: true, deletedAt: null },
  deletedViewer: { id: 'viewer', systemRole: 'user', banned: false, deletedAt: new Date() },
};

const visibilities: ModelVisibility[] = ['public', 'unlisted', 'private'];
const roles: (AuthorRole | null)[] = [null, 'owner', 'contributor'];
const grants: (PermissionLevel | null)[] = [null, 'read', 'write', 'admin'];

describe('readableModelFilter', () => {
  it('agrees with canRead on every viewer, visibility, role, grant and deletion state', () => {
    const disagreements: string[] = [];

    for (const [viewerName, viewer] of Object.entries(viewers)) {
      const filter = readableModelFilter(viewer) as Record<string, any>;

      for (const visibility of visibilities) {
        for (const deleted of [false, true]) {
          for (const authorRole of roles) {
            for (const grant of grants) {
              const model: ModelAccessSubject = {
                id: 'model-1',
                visibility,
                deletedAt: deleted ? new Date() : null,
              };
              const row: Row = { model, authorRole, grant };

              const ctx: PolicyContext = {
                viewer,
                model,
                ownerRole: authorRole,
                grantLevel: grant,
              };

              const expected = canRead(ctx);
              const actual = matches(filter, row, viewer?.id ?? null);

              if (expected !== actual) {
                disagreements.push(
                  `${viewerName} / ${visibility} / deleted=${deleted} / role=${authorRole} / grant=${grant}: policy=${expected} filter=${actual}`,
                );
              }
            }
          }
        }
      }
    }

    expect(disagreements).toEqual([]);
  });

  it('matches nothing for a banned viewer', () => {
    expect(readableModelFilter(viewers['banned']!)).toEqual({ id: { in: [] } });
  });

  it('is unconstrained for an active admin', () => {
    expect(readableModelFilter(viewers['admin']!)).toEqual({});
  });
});
