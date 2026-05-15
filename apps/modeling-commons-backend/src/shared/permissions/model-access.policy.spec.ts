import { describe, expect, it } from 'vitest';
import { canAdmin, canRead, canWrite, policy } from './model-access.policy.ts';
import type {
  ModelAccessSubject,
  PolicyContext,
  ViewerContext,
} from './model-access.types.ts';
import type { AuthorRole, PermissionLevel } from '#src/modules/model-permission/domain/permission.types.ts';

function viewer(overrides: Partial<ViewerContext> = {}): ViewerContext {
  return {
    id: 'user-1',
    systemRole: 'user',
    banned: false,
    deletedAt: null,
    ...overrides,
  };
}

function model(overrides: Partial<ModelAccessSubject> = {}): ModelAccessSubject {
  return {
    id: 'model-1',
    visibility: 'public',
    deletedAt: null,
    ...overrides,
  };
}

function ctx(
  partial: Partial<PolicyContext> & { viewer?: ViewerContext | null } = {},
): PolicyContext {
  return {
    viewer: partial.viewer === undefined ? viewer() : partial.viewer,
    model: partial.model ?? model(),
    ownerRole: partial.ownerRole ?? null,
    grantLevel: partial.grantLevel ?? null,
  };
}

describe('model-access.policy', () => {
  describe('preconditions', () => {
    it('denies banned viewers at every level', () => {
      const c = ctx({ viewer: viewer({ banned: true }), ownerRole: 'owner' });
      expect(canRead(c)).toBe(false);
      expect(canWrite(c)).toBe(false);
      expect(canAdmin(c)).toBe(false);
    });

    it('denies soft-deleted viewers at every level', () => {
      const c = ctx({ viewer: viewer({ deletedAt: new Date() }), ownerRole: 'owner' });
      expect(canRead(c)).toBe(false);
      expect(canWrite(c)).toBe(false);
      expect(canAdmin(c)).toBe(false);
    });

    it('denies soft-deleted models to non-admin non-owner viewers', () => {
      const c = ctx({
        viewer: viewer(),
        model: model({ deletedAt: new Date() }),
        grantLevel: 'admin',
      });
      expect(canRead(c)).toBe(false);
      expect(canWrite(c)).toBe(false);
      expect(canAdmin(c)).toBe(false);
    });

    it('allows global admin to read a soft-deleted model', () => {
      const c = ctx({
        viewer: viewer({ systemRole: 'admin' }),
        model: model({ deletedAt: new Date() }),
      });
      expect(canRead(c)).toBe(true);
    });

    it('allows owner to read a soft-deleted model', () => {
      const c = ctx({
        viewer: viewer(),
        model: model({ deletedAt: new Date() }),
        ownerRole: 'owner',
      });
      expect(canRead(c)).toBe(true);
      expect(canWrite(c)).toBe(false);
      expect(canAdmin(c)).toBe(false);
    });
  });

  describe('read', () => {
    it('allows anonymous on public', () => {
      expect(canRead(ctx({ viewer: null, model: model({ visibility: 'public' }) }))).toBe(true);
    });

    it('allows anonymous on unlisted', () => {
      expect(canRead(ctx({ viewer: null, model: model({ visibility: 'unlisted' }) }))).toBe(true);
    });

    it('denies anonymous on private', () => {
      expect(canRead(ctx({ viewer: null, model: model({ visibility: 'private' }) }))).toBe(false);
    });

    it('allows authenticated viewer on public with no relation', () => {
      expect(canRead(ctx({ viewer: viewer(), model: model({ visibility: 'public' }) }))).toBe(true);
    });

    it('denies authenticated viewer on private with no relation', () => {
      expect(canRead(ctx({ viewer: viewer(), model: model({ visibility: 'private' }) }))).toBe(
        false,
      );
    });

    it('allows owner on private', () => {
      const c = ctx({
        viewer: viewer(),
        model: model({ visibility: 'private' }),
        ownerRole: 'owner',
      });
      expect(canRead(c)).toBe(true);
    });

    it('allows contributor on private', () => {
      const c = ctx({
        viewer: viewer(),
        model: model({ visibility: 'private' }),
        ownerRole: 'contributor',
      });
      expect(canRead(c)).toBe(true);
    });

    for (const level of ['read', 'write', 'admin'] as PermissionLevel[]) {
      it(`allows grant=${level} on private`, () => {
        const c = ctx({
          viewer: viewer(),
          model: model({ visibility: 'private' }),
          grantLevel: level,
        });
        expect(canRead(c)).toBe(true);
      });
    }

    it('allows global admin on any visibility', () => {
      for (const visibility of ['public', 'private', 'unlisted'] as const) {
        const c = ctx({ viewer: viewer({ systemRole: 'admin' }), model: model({ visibility }) });
        expect(canRead(c)).toBe(true);
      }
    });
  });

  describe('write', () => {
    it('denies anonymous on any visibility', () => {
      for (const visibility of ['public', 'private', 'unlisted'] as const) {
        const c = ctx({ viewer: null, model: model({ visibility }) });
        expect(canWrite(c)).toBe(false);
      }
    });

    it('denies authenticated viewer with no relation on public', () => {
      expect(canWrite(ctx({ viewer: viewer(), model: model({ visibility: 'public' }) }))).toBe(
        false,
      );
    });

    it('allows owner', () => {
      const c = ctx({ viewer: viewer(), ownerRole: 'owner' });
      expect(canWrite(c)).toBe(true);
    });

    it('allows contributor', () => {
      const c = ctx({ viewer: viewer(), ownerRole: 'contributor' });
      expect(canWrite(c)).toBe(true);
    });

    it('denies grant=read', () => {
      expect(canWrite(ctx({ viewer: viewer(), grantLevel: 'read' }))).toBe(false);
    });

    it('allows grant=write', () => {
      expect(canWrite(ctx({ viewer: viewer(), grantLevel: 'write' }))).toBe(true);
    });

    it('allows grant=admin', () => {
      expect(canWrite(ctx({ viewer: viewer(), grantLevel: 'admin' }))).toBe(true);
    });

    it('allows global admin without any relation', () => {
      expect(canWrite(ctx({ viewer: viewer({ systemRole: 'admin' }) }))).toBe(true);
    });
  });

  describe('admin', () => {
    it('denies anonymous', () => {
      expect(canAdmin(ctx({ viewer: null }))).toBe(false);
    });

    it('denies contributor', () => {
      expect(canAdmin(ctx({ viewer: viewer(), ownerRole: 'contributor' }))).toBe(false);
    });

    it('allows owner', () => {
      expect(canAdmin(ctx({ viewer: viewer(), ownerRole: 'owner' }))).toBe(true);
    });

    for (const level of ['read', 'write'] as PermissionLevel[]) {
      it(`denies grant=${level}`, () => {
        expect(canAdmin(ctx({ viewer: viewer(), grantLevel: level }))).toBe(false);
      });
    }

    it('allows grant=admin', () => {
      expect(canAdmin(ctx({ viewer: viewer(), grantLevel: 'admin' }))).toBe(true);
    });

    it('allows global admin', () => {
      expect(canAdmin(ctx({ viewer: viewer({ systemRole: 'admin' }) }))).toBe(true);
    });
  });

  describe('policy export', () => {
    it('maps levels to predicates', () => {
      const c = ctx({ viewer: viewer(), ownerRole: 'owner' as AuthorRole });
      expect(policy.read(c)).toBe(canRead(c));
      expect(policy.write(c)).toBe(canWrite(c));
      expect(policy.admin(c)).toBe(canAdmin(c));
    });
  });
});
