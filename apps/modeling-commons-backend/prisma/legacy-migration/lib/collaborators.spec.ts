import { describe, expect, test } from 'vitest';
import {
  authorKey,
  buildTypeNameById,
  planCollaborators,
  type CollaboratorContext,
  type ExistingAuthor,
} from './collaborators.ts';
import type { LegacyCollaboration, LegacyNonMemberCollaboration } from './legacy.ts';

const MODEL = 'model-id-1';
const USER = 'user-id-1';
const CREATED = new Date('2013-05-01T00:00:00Z');

const TYPES = buildTypeNameById([
  { id: 1, name: 'Author' },
  { id: 2, name: 'Domain expert' },
  { id: 5, name: '  Editor  ' },
  { id: 9, name: '   ' },
]);

function ctx(overrides: Partial<CollaboratorContext> = {}): CollaboratorContext {
  return {
    userIdByLegacyId: new Map([[10, USER]]),
    modelIdByLegacyId: new Map([[20, MODEL]]),
    typeNameById: TYPES,
    existingAuthors: new Map<string, ExistingAuthor>(),
    existingNonMemberLegacyIds: new Set<number>(),
    ...overrides,
  };
}

function collab(overrides: Partial<LegacyCollaboration> = {}): LegacyCollaboration {
  return {
    id: 1,
    person_id: 10,
    node_id: 20,
    collaborator_type_id: 2,
    created_at: CREATED,
    ...overrides,
  };
}

function nonMember(
  overrides: Partial<LegacyNonMemberCollaboration> = {},
): LegacyNonMemberCollaboration {
  return {
    id: 100,
    non_member_collaborator_id: 7,
    node_id: 20,
    collaborator_type_id: 1,
    person_id: 10,
    email: 'ada@example.com',
    name: 'Ada',
    created_at: CREATED,
    ...overrides,
  };
}

describe('buildTypeNameById', () => {
  test('trims names and drops blank ones', () => {
    expect(TYPES.get(5)).toBe('Editor');
    expect(TYPES.has(9)).toBe(false);
  });
});

describe('planCollaborators - members', () => {
  test('a collaborator with no ModelAuthor row becomes a typed contributor', () => {
    const plan = planCollaborators([collab()], [], ctx());

    expect(plan.authorInserts).toEqual([
      {
        legacyCollaborationId: 1,
        modelId: MODEL,
        userId: USER,
        role: 'contributor',
        collaboratorType: 'Domain expert',
        createdAt: CREATED,
      },
    ]);
    expect(plan.authorTypeUpdates).toEqual([]);
  });

  test('an existing author keeps its role and only gains the type', () => {
    const existingAuthors = new Map<string, ExistingAuthor>([
      [authorKey(MODEL, USER), { role: 'owner', collaboratorType: null }],
    ]);
    const plan = planCollaborators([collab()], [], ctx({ existingAuthors }));

    expect(plan.authorInserts).toEqual([]);
    expect(plan.authorTypeUpdates).toEqual([
      { legacyCollaborationId: 1, modelId: MODEL, userId: USER, collaboratorType: 'Domain expert' },
    ]);
  });

  test('an author that already carries a type is left alone, so re-runs are no-ops', () => {
    const existingAuthors = new Map<string, ExistingAuthor>([
      [authorKey(MODEL, USER), { role: 'contributor', collaboratorType: 'Author' }],
    ]);
    const plan = planCollaborators([collab()], [], ctx({ existingAuthors }));

    expect(plan.authorInserts).toEqual([]);
    expect(plan.authorTypeUpdates).toEqual([]);
    expect(plan.skipped.alreadyTyped).toBe(1);
  });

  test('an untyped collaboration does not overwrite an untyped existing author', () => {
    const existingAuthors = new Map<string, ExistingAuthor>([
      [authorKey(MODEL, USER), { role: 'owner', collaboratorType: null }],
    ]);
    const plan = planCollaborators(
      [collab({ collaborator_type_id: null })],
      [],
      ctx({ existingAuthors }),
    );

    expect(plan.authorTypeUpdates).toEqual([]);
    expect(plan.skipped.alreadyTyped).toBe(1);
  });

  test('an unknown type id lands as a null type rather than failing', () => {
    const plan = planCollaborators([collab({ collaborator_type_id: 404 })], [], ctx());
    expect(plan.authorInserts[0]?.collaboratorType).toBeNull();
  });

  test('a second row for the same pair is dropped, since ModelAuthor is keyed on it', () => {
    const plan = planCollaborators([collab({ id: 1 }), collab({ id: 2 })], [], ctx());

    expect(plan.authorInserts).toHaveLength(1);
    expect(plan.authorInserts[0]?.legacyCollaborationId).toBe(1);
    expect(plan.skipped.duplicatePair).toBe(1);
  });

  test('rows pointing at a missing model or user are counted, not written', () => {
    const plan = planCollaborators(
      [collab({ id: 1, node_id: 999 }), collab({ id: 2, person_id: 999 }), collab({ id: 3, node_id: null })],
      [],
      ctx(),
    );

    expect(plan.authorInserts).toEqual([]);
    expect(plan.skipped.orphanModel).toBe(2);
    expect(plan.skipped.orphanUser).toBe(1);
  });
});

describe('planCollaborators - non-members', () => {
  test('carries identity, type and the member who added them', () => {
    const plan = planCollaborators([], [nonMember()], ctx());

    expect(plan.nonMemberInserts).toEqual([
      {
        legacyId: 100,
        modelId: MODEL,
        email: 'ada@example.com',
        name: 'Ada',
        collaboratorType: 'Author',
        addedByUserId: USER,
        createdAt: CREATED,
      },
    ]);
  });

  test('a legacyId already in the target is skipped, so re-runs are no-ops', () => {
    const plan = planCollaborators([], [nonMember()], ctx({ existingNonMemberLegacyIds: new Set([100]) }));

    expect(plan.nonMemberInserts).toEqual([]);
    expect(plan.skipped.alreadyPresent).toBe(1);
  });

  test('a dangling collaborator join keeps the row with null identity', () => {
    const plan = planCollaborators(
      [],
      [nonMember({ non_member_collaborator_id: null, email: null, name: '  ' })],
      ctx(),
    );

    expect(plan.nonMemberInserts[0]).toMatchObject({ email: null, name: null });
  });

  test('an unmigrated adder is recorded as null rather than dropping the row', () => {
    const plan = planCollaborators([], [nonMember({ person_id: 999 })], ctx());

    expect(plan.nonMemberInserts).toHaveLength(1);
    expect(plan.nonMemberInserts[0]?.addedByUserId).toBeNull();
  });
});
