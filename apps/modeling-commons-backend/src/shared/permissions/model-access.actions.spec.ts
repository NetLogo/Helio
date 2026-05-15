import { describe, expect, it } from 'vitest';
import { MODEL_ACTIONS, resolveActions, type ModelActionKey } from './model-access.actions.ts';
import type {
  ModelAccessSubject,
  PolicyContext,
  ViewerContext,
} from './model-access.types.ts';

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

const readActions = (Object.keys(MODEL_ACTIONS) as ModelActionKey[]).filter(
  (k) => MODEL_ACTIONS[k].level === 'read',
);
const writeActions = (Object.keys(MODEL_ACTIONS) as ModelActionKey[]).filter(
  (k) => MODEL_ACTIONS[k].level === 'write',
);
const adminActions = (Object.keys(MODEL_ACTIONS) as ModelActionKey[]).filter(
  (k) => MODEL_ACTIONS[k].level === 'admin',
);

function expectAllTrue(map: Record<string, boolean>, keys: string[]) {
  for (const key of keys) expect(map[key], key).toBe(true);
}

function expectAllFalse(map: Record<string, boolean>, keys: string[]) {
  for (const key of keys) expect(map[key], key).toBe(false);
}

describe('resolveActions', () => {
  it('anonymous viewer on public model: canView true, every authRequired action false', () => {
    const actions = resolveActions(ctx({ viewer: null, model: model({ visibility: 'public' }) }));
    expect(actions.canView).toBe(true);
    const authRequiredKeys = (Object.keys(MODEL_ACTIONS) as ModelActionKey[]).filter(
      (k) => MODEL_ACTIONS[k].authRequired,
    );
    expectAllFalse(actions, authRequiredKeys);
  });

  it('anonymous viewer on unlisted model: same as public', () => {
    const actions = resolveActions(ctx({ viewer: null, model: model({ visibility: 'unlisted' }) }));
    expect(actions.canView).toBe(true);
    expectAllFalse(actions, [...writeActions, ...adminActions]);
  });

  it('anonymous viewer on private model: all false', () => {
    const actions = resolveActions(ctx({ viewer: null, model: model({ visibility: 'private' }) }));
    expectAllFalse(actions, Object.keys(MODEL_ACTIONS));
  });

  it('authenticated viewer, no relation, public model: read actions true, write/admin false', () => {
    const actions = resolveActions(
      ctx({ viewer: viewer(), model: model({ visibility: 'public' }) }),
    );
    expectAllTrue(actions, readActions);
    expectAllFalse(actions, [...writeActions, ...adminActions]);
  });

  it('authenticated viewer, no relation, private model: all false', () => {
    const actions = resolveActions(
      ctx({ viewer: viewer(), model: model({ visibility: 'private' }) }),
    );
    expectAllFalse(actions, Object.keys(MODEL_ACTIONS));
  });

  it('contributor: read + write true, admin false', () => {
    const actions = resolveActions(
      ctx({
        viewer: viewer(),
        model: model({ visibility: 'private' }),
        ownerRole: 'contributor',
      }),
    );
    expectAllTrue(actions, [...readActions, ...writeActions]);
    expectAllFalse(actions, adminActions);
  });

  it('owner: all true', () => {
    const actions = resolveActions(
      ctx({
        viewer: viewer(),
        model: model({ visibility: 'private' }),
        ownerRole: 'owner',
      }),
    );
    expectAllTrue(actions, Object.keys(MODEL_ACTIONS));
  });

  it('grant=read on private model: read actions true, write/admin false', () => {
    const actions = resolveActions(
      ctx({
        viewer: viewer(),
        model: model({ visibility: 'private' }),
        grantLevel: 'read',
      }),
    );
    expectAllTrue(actions, readActions);
    expectAllFalse(actions, [...writeActions, ...adminActions]);
  });

  it('grant=write on private model: read + write true, admin false', () => {
    const actions = resolveActions(
      ctx({
        viewer: viewer(),
        model: model({ visibility: 'private' }),
        grantLevel: 'write',
      }),
    );
    expectAllTrue(actions, [...readActions, ...writeActions]);
    expectAllFalse(actions, adminActions);
  });

  it('grant=admin on private model: all true', () => {
    const actions = resolveActions(
      ctx({
        viewer: viewer(),
        model: model({ visibility: 'private' }),
        grantLevel: 'admin',
      }),
    );
    expectAllTrue(actions, Object.keys(MODEL_ACTIONS));
  });

  it('global admin: all true', () => {
    const actions = resolveActions(
      ctx({
        viewer: viewer({ systemRole: 'admin' }),
        model: model({ visibility: 'private' }),
      }),
    );
    expectAllTrue(actions, Object.keys(MODEL_ACTIONS));
  });

  it('banned viewer: all false', () => {
    const actions = resolveActions(
      ctx({
        viewer: viewer({ banned: true, systemRole: 'admin' }),
        ownerRole: 'owner',
      }),
    );
    expectAllFalse(actions, Object.keys(MODEL_ACTIONS));
  });

  it('soft-deleted viewer: all false', () => {
    const actions = resolveActions(
      ctx({
        viewer: viewer({ deletedAt: new Date() }),
        ownerRole: 'owner',
      }),
    );
    expectAllFalse(actions, Object.keys(MODEL_ACTIONS));
  });

  it('soft-deleted model + non-admin viewer: all false', () => {
    const actions = resolveActions(
      ctx({
        viewer: viewer(),
        model: model({ deletedAt: new Date() }),
        grantLevel: 'admin',
      }),
    );
    expectAllFalse(actions, Object.keys(MODEL_ACTIONS));
  });

  it('soft-deleted model + global admin: canView true, write/admin false (model.deletedAt blocks write)', () => {
    const actions = resolveActions(
      ctx({
        viewer: viewer({ systemRole: 'admin' }),
        model: model({ deletedAt: new Date() }),
      }),
    );
    expect(actions.canView).toBe(true);
    expectAllFalse(actions, [...writeActions, ...adminActions]);
  });
});
