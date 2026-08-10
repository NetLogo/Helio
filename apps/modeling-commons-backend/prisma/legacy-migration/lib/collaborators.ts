import type {
  LegacyCollaboration,
  LegacyCollaboratorType,
  LegacyNonMemberCollaboration,
} from './legacy.ts';

export type ExistingAuthor = { role: 'owner' | 'contributor'; collaboratorType: string | null };

export type CollaboratorContext = {
  userIdByLegacyId: ReadonlyMap<number, string>;
  modelIdByLegacyId: ReadonlyMap<number, string>;
  typeNameById: ReadonlyMap<number, string>;
  /** Keyed `${modelUuid}\0${userUuid}` — the ModelAuthor rows already in the target. */
  existingAuthors: ReadonlyMap<string, ExistingAuthor>;
  existingNonMemberLegacyIds: ReadonlySet<number>;
};

export type AuthorInsert = {
  legacyCollaborationId: number;
  modelId: string;
  userId: string;
  role: 'contributor';
  collaboratorType: string | null;
  createdAt: Date | null;
};

export type AuthorTypeUpdate = {
  legacyCollaborationId: number;
  modelId: string;
  userId: string;
  collaboratorType: string;
};

export type NonMemberInsert = {
  legacyId: number;
  modelId: string;
  email: string | null;
  name: string | null;
  collaboratorType: string | null;
  addedByUserId: string | null;
  createdAt: Date | null;
};

export type CollaboratorPlan = {
  authorInserts: AuthorInsert[];
  authorTypeUpdates: AuthorTypeUpdate[];
  nonMemberInserts: NonMemberInsert[];
  skipped: {
    orphanUser: number;
    orphanModel: number;
    alreadyTyped: number;
    alreadyPresent: number;
    duplicatePair: number;
  };
};

export function authorKey(modelId: string, userId: string): string {
  return `${modelId}\0${userId}`;
}

export function buildTypeNameById(types: readonly LegacyCollaboratorType[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const t of types) {
    const name = t.name?.trim();
    if (name) map.set(t.id, name);
  }
  return map;
}

/**
 * Rows whose node or person is missing from the target drop out as orphans rather
 * than failing the run, and an unknown type id lands as a null collaboratorType.
 */
export function planCollaborators(
  collaborations: readonly LegacyCollaboration[],
  nonMembers: readonly LegacyNonMemberCollaboration[],
  ctx: CollaboratorContext,
): CollaboratorPlan {
  const plan: CollaboratorPlan = {
    authorInserts: [],
    authorTypeUpdates: [],
    nonMemberInserts: [],
    skipped: {
      orphanUser: 0,
      orphanModel: 0,
      alreadyTyped: 0,
      alreadyPresent: 0,
      duplicatePair: 0,
    },
  };

  const claimed = new Set<string>();

  for (const c of collaborations) {
    const modelId = c.node_id === null ? undefined : ctx.modelIdByLegacyId.get(c.node_id);
    if (!modelId) {
      plan.skipped.orphanModel++;
      continue;
    }
    const userId = c.person_id === null ? undefined : ctx.userIdByLegacyId.get(c.person_id);
    if (!userId) {
      plan.skipped.orphanUser++;
      continue;
    }

    const key = authorKey(modelId, userId);
    if (claimed.has(key)) {
      plan.skipped.duplicatePair++;
      continue;
    }

    const type =
      c.collaborator_type_id === null ? null : (ctx.typeNameById.get(c.collaborator_type_id) ?? null);
    const existing = ctx.existingAuthors.get(key);

    if (existing) {
      if (existing.collaboratorType !== null || type === null) {
        plan.skipped.alreadyTyped++;
        continue;
      }
      claimed.add(key);
      plan.authorTypeUpdates.push({
        legacyCollaborationId: c.id,
        modelId,
        userId,
        collaboratorType: type,
      });
      continue;
    }

    claimed.add(key);
    plan.authorInserts.push({
      legacyCollaborationId: c.id,
      modelId,
      userId,
      role: 'contributor',
      collaboratorType: type,
      createdAt: c.created_at,
    });
  }

  for (const n of nonMembers) {
    if (ctx.existingNonMemberLegacyIds.has(n.id)) {
      plan.skipped.alreadyPresent++;
      continue;
    }
    const modelId = n.node_id === null ? undefined : ctx.modelIdByLegacyId.get(n.node_id);
    if (!modelId) {
      plan.skipped.orphanModel++;
      continue;
    }

    plan.nonMemberInserts.push({
      legacyId: n.id,
      modelId,
      email: n.email?.trim() || null,
      name: n.name?.trim() || null,
      collaboratorType:
        n.collaborator_type_id === null
          ? null
          : (ctx.typeNameById.get(n.collaborator_type_id) ?? null),
      addedByUserId: ctx.userIdByLegacyId.get(n.person_id) ?? null,
      createdAt: n.created_at,
    });
  }

  return plan;
}
