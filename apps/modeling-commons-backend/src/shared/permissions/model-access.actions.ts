import { policy } from './model-access.policy.ts';
import type { AccessLevel, PolicyContext } from './model-access.types.ts';

export const MODEL_ACTIONS = {
  canView: { level: 'read', authRequired: false },
  canFork: { level: 'read', authRequired: true },
  canComment: { level: 'read', authRequired: true },
  canReport: { level: 'read', authRequired: true },
  canLike: { level: 'read', authRequired: true },
  canEdit: { level: 'write', authRequired: true },
  canPublishVersion: { level: 'write', authRequired: true },
  canEditDraft: { level: 'write', authRequired: true },
  canRevertVersion: { level: 'write', authRequired: true },
  canManageAuthors: { level: 'admin', authRequired: true },
  canChangePermissions: { level: 'admin', authRequired: true },
  canTransferOwnership: { level: 'admin', authRequired: true },
  canDelete: { level: 'admin', authRequired: true },
} as const satisfies Record<string, { level: AccessLevel; authRequired: boolean }>;

export type ModelActionKey = keyof typeof MODEL_ACTIONS;
export type ModelActionMap = { [K in ModelActionKey]: boolean };

export function resolveActions(ctx: PolicyContext): ModelActionMap {
  const allow = {
    read: policy.read(ctx),
    write: policy.write(ctx),
    admin: policy.admin(ctx),
  } as const;

  const out = {} as ModelActionMap;
  for (const key of Object.keys(MODEL_ACTIONS) as ModelActionKey[]) {
    const { level, authRequired } = MODEL_ACTIONS[key];
    out[key] = (!authRequired || ctx.viewer !== null) && allow[level];
  }
  return out;
}
