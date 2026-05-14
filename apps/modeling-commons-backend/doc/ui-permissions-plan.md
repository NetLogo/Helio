# UI permissions plan: action map on model detail DTO

## Framing

The frontend currently decides which action buttons to render on a Model page (Edit, Delete, Fork, Comment, Report, Manage authors, ...) by re-deriving permissions from `model.visibility` and `viewer.id`. That logic has drifted from the server policy and will drift again every time a new action is added. This plan moves the decision server-side: `GET /v1/models/:id` returns a `permissions` action map alongside the existing fields, the frontend renders a button iff its corresponding key is `true`.

The action map is computed by composing the level predicates from `[[permission-unification-plan]]` (`canRead/canWrite/canAdmin`) with a small action→level table. The map is the single source of truth; the frontend never re-evaluates.

What this plan does **not** cover:
- Action maps on list/card DTOs (`searchModelsCardQuery`, `getModelChildrenQuery`, ...). See "List endpoints" below — kept out of MVP.
- Action maps on non-Model resources (`ModelVersion`, `ModelComment`, `ModelReport`, ...).
- A separate `GET /v1/models/:id/permissions` endpoint. Rejected — embedding keeps payloads consistent and avoids an extra round-trip.

This plan **depends on** `[[permission-unification-plan]]` landing first; it consumes the policy types and predicates from `src/shared/permissions/`.

## The action map (canonical)

Every UI-gated action on a Model is one row in this table. The frontend names a button after the key; the server returns a boolean per key. Adding an action = appending a row.

| Action                  | Level   | authRequired | Notes |
|-------------------------|---------|--------------|-------|
| `canView`               | `read`  | false        | Mirrors `resolveModel('read')`. Anonymous viewers can be `true` for public/unlisted. |
| `canFork`               | `read`  | true         | Anyone who can read can fork. Matches `[[model-fork-plan]]`. |
| `canComment`            | `read`  | true         | Post on the model's discussion. See `[[legacy-migration-discussion-plan]]`. |
| `canReport`             | `read`  | true         | Submit a moderation report. See `[[legacy-migration-reporting-plan]]`. |
| `canLike`               | `read`  | true         | Toggle like (`ModelLike`). |
| `canEdit`               | `write` | true         | Title / description / visibility / `isEndorsed`. |
| `canPublishVersion`     | `write` | true         | Upload a new `ModelVersion`. |
| `canEditDraft`          | `write` | true         | Edit the current draft version's metadata. |
| `canRevertVersion`      | `write` | true         | Revert latest to an older version. |
| `canManageAuthors`      | `admin` | true         | Add/remove `ModelAuthor` rows (contributor or owner). |
| `canChangePermissions`  | `admin` | true         | Modify `ModelPermission` grants. |
| `canTransferOwnership`  | `admin` | true         | Hand off the `owner` role. |
| `canDelete`             | `admin` | true         | Soft-delete the Model. |

The table is encoded once in `src/shared/permissions/model-access.actions.ts`:

```ts
import type { AccessLevel } from '#src/shared/permissions/model-access.types.ts';

export const MODEL_ACTIONS = {
  canView:              { level: 'read',  authRequired: false },
  canFork:              { level: 'read',  authRequired: true  },
  canComment:           { level: 'read',  authRequired: true  },
  canReport:            { level: 'read',  authRequired: true  },
  canLike:              { level: 'read',  authRequired: true  },
  canEdit:              { level: 'write', authRequired: true  },
  canPublishVersion:    { level: 'write', authRequired: true  },
  canEditDraft:         { level: 'write', authRequired: true  },
  canRevertVersion:     { level: 'write', authRequired: true  },
  canManageAuthors:     { level: 'admin', authRequired: true  },
  canChangePermissions: { level: 'admin', authRequired: true  },
  canTransferOwnership: { level: 'admin', authRequired: true  },
  canDelete:            { level: 'admin', authRequired: true  },
} as const satisfies Record<string, { level: AccessLevel; authRequired: boolean }>;

export type ModelActionKey = keyof typeof MODEL_ACTIONS;
export type ModelActionMap = { [K in ModelActionKey]: boolean };
```

`ModelActionMap` is inferred from `MODEL_ACTIONS` — there is no parallel list to keep in sync.

## Files

New:

- `src/shared/permissions/model-access.actions.ts` — the const above + `resolveActions(ctx)`.
- `src/shared/permissions/model-access.actions.spec.ts` — unit test matrix (see Tests).

Modified:

- `src/modules/model/dtos/model.dto.ts` — add `permissions: modelActionMapSchema` to `modelResponseDtoSchema`. New `modelActionMapSchema` declared in the same file (or a sibling `model-permissions.dto.ts`; sibling is cleaner if the schema is reused on card DTOs later).
- `src/modules/model/model.mapper.ts` — current shape is `createReadOnlyMapper<Model, Omit<Model, 'deletedAt'>>({ toResponse })`. Replace with a factory that takes a `PolicyContext` (or just `viewer` + the already-loaded `author`/`grant` rows from the preHandler) and emits `permissions`. Signature becomes `toResponse(entity, ctx)`.
- `src/modules/model/model.route.ts` — the `GET /v1/models/:id` handler at lines 79-93 currently does `modelMapper.toResponse(entity)`. After this plan, it passes `ctx` carrying viewer + author + grant. The simplest path: have `resolveModel('read')` (from the unification plan) attach the resolved `PolicyContext` to `request` as `request.modelAccess`, then the handler does `modelMapper.toResponse(entity, request.modelAccess)`. No extra DB round-trips — the preHandler already loaded these rows.

## `resolveActions` function

```ts
// model-access.actions.ts
import { policy } from '#src/shared/permissions/model-access.policy.ts';
import type { PolicyContext } from '#src/shared/permissions/model-access.policy.ts';
import { MODEL_ACTIONS, type ModelActionMap, type ModelActionKey } from './model-access.actions.ts';

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
```

Anonymous viewer + `authRequired:true` → `false`. Banned/deleted viewer collapses to all-`false` automatically because the underlying `policy.*` predicates already deny them (per the unification plan's preconditions). Soft-deleted model collapses the same way.

Three policy calls per request — cheap. No DB I/O; `policy.*` are pure over the already-loaded `PolicyContext`.

## Typebox schema for the permissions block

Fastify needs a static Typebox schema for OpenAPI introspection and response validation, so generating from `Object.keys(MODEL_ACTIONS)` at module init is awkward (the schema is constructed at runtime but the `Static<...>` inference happens at compile time). Hand-write the schema and assert its keys match `ModelActionKey` at compile time:

```ts
// src/modules/model/dtos/model-permissions.dto.ts
import { Type, type Static } from 'typebox';
import type { ModelActionMap } from '#src/shared/permissions/model-access.actions.ts';

export const modelPermissionsDtoSchema = Type.Object({
  canView:              Type.Boolean(),
  canFork:              Type.Boolean(),
  canComment:           Type.Boolean(),
  canReport:            Type.Boolean(),
  canLike:              Type.Boolean(),
  canEdit:              Type.Boolean(),
  canPublishVersion:    Type.Boolean(),
  canEditDraft:         Type.Boolean(),
  canRevertVersion:     Type.Boolean(),
  canManageAuthors:     Type.Boolean(),
  canChangePermissions: Type.Boolean(),
  canTransferOwnership: Type.Boolean(),
  canDelete:            Type.Boolean(),
});

type _AssertSameKeys = Static<typeof modelPermissionsDtoSchema> extends ModelActionMap
  ? ModelActionMap extends Static<typeof modelPermissionsDtoSchema>
    ? true
    : never
  : never;
const _check: _AssertSameKeys = true; // compile error if keys drift
```

Adding a new action: append to `MODEL_ACTIONS`, append `Type.Boolean()` to the schema. Forget either step and TypeScript breaks the build on `_check`.

`modelResponseDtoSchema` (currently in `src/modules/model/dtos/model.dto.ts` lines 80-90) gains one new field:

```ts
export const modelResponseDtoSchema = Type.Intersect([
  baseResponseDtoSchema,
  Type.Object({
    latestVersionNumber: Type.Union([Type.Integer(), Type.Null()]),
    parentModelId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
    parentVersionNumber: Type.Union([Type.Integer(), Type.Null()]),
    visibility: visibilitySchema,
    isEndorsed: Type.Boolean(),
    isLibraryModel: Type.Boolean(),
    permissions: modelPermissionsDtoSchema,
  }),
]);
```

## Mapper integration

The current mapper (`src/modules/model/model.mapper.ts`) is a 1-arg `toResponse(entity)`. It needs a `ctx` to compute `permissions`. The cleanest change:

```ts
// model.mapper.ts (post-change, illustrative)
import type { Model } from '#prisma/index';
import type { PolicyContext } from '#src/shared/permissions/model-access.policy.ts';
import { resolveActions } from '#src/shared/permissions/model-access.actions.ts';
import type { ModelResponseDto } from './dtos/model.dto.ts';

export default function modelMapper() {
  return {
    toResponse(entity: Model, ctx: PolicyContext): ModelResponseDto {
      const { deletedAt: _deletedAt, ...rest } = entity;
      return { ...rest, permissions: resolveActions(ctx) };
    },
  };
}
```

This is a breaking change to the mapper's contract. Two call sites currently call `modelMapper.toResponse`:

- `model.route.ts:91` — `GET /v1/models/:id` — has `resolveModel('read')` preHandler; can read the ctx off `request.modelAccess` (added by the unification plan's preHandler) and pass it through.
- `model.route.ts:142, 188` — `GET /v1/models` and `GET /v1/models/:id/children` — list endpoints. See next section.

The `createReadOnlyMapper` helper in `src/shared/ddd/create-mapper.ts` is currently 1-arg; either widen its generic to support a second arg, or drop the helper for this mapper and inline the function. Inlining is simpler since this is the only mapper that needs viewer context.

## List endpoints

`GET /v1/models` and `GET /v1/models/:id/children` map their result arrays via `modelMapper.toResponse`. Three options:

1. **MVP (recommended): list cards do not carry `permissions`.** Split the mapper into `toResponse(entity, ctx)` for detail and a card-level shape that omits `permissions`. List DTOs no longer share `modelResponseDtoSchema` — they get a sibling `modelListItemResponseDtoSchema` without the new field.
2. Compute `permissions` per row. This requires loading per-row `ownerRole` and `grantLevel` for the viewer — currently the route preHandler does this for a single resolved Model. For lists we would need batched lookups (`ModelAuthor where modelId in (...) and userId = viewer.id`, same for `ModelPermission`). Cheap with proper indexes (`@@index([userId])` on `ModelAuthor`, `@@unique([modelId, granteeUserId])` on `ModelPermission`), but the cost is real and the data is rarely used.
3. Embed only the actions a list page actually shows (`canEdit`, `canDelete`) — narrower variant of (2).

Recommend (1) for MVP. Adopt (3) when product needs an admin-style list with row-level Edit/Delete. Flag as the main open question.

If (1) lands, the two list-endpoint mapper calls become `listMapper.toResponse(entity)` — no ctx — and the unification work doesn't have to thread viewer into the list mapper.

## Tests

`src/shared/permissions/model-access.actions.spec.ts` — pure unit, mirrors the matrix from `model-access.policy.spec.ts` but asserts the *action map*, not the level booleans. Reuse the same `PolicyContext` fixtures.

Cases:

- **Anonymous viewer, public model:** `canView=true`; every `authRequired:true` key is `false`.
- **Anonymous viewer, unlisted model:** same as public (policy allows read; everything else gated by auth).
- **Anonymous viewer, private model:** all `false` (policy denies read; `authRequired:false` `canView` still ends up `false` because `policy.read` returns `false`).
- **Authenticated viewer, no relation, public model:** read actions `true` (`canView`, `canFork`, `canComment`, `canLike`, `canReport`); write/admin `false`.
- **Authenticated viewer, no relation, private model:** all `false`.
- **Contributor (ModelAuthor role=contributor):** read + write `true`; admin `false`.
- **Owner (ModelAuthor role=owner):** all `true`.
- **Grant=read on private model:** read actions `true`; write/admin `false`.
- **Grant=write on private model:** read + write `true`; admin `false`.
- **Grant=admin on private model:** all `true`.
- **Global admin (systemRole=admin):** all `true` (per the unification plan's admin override).
- **Banned viewer:** all `false` (policy preconditions deny everything; action map collapses).
- **Deleted viewer (`viewer.deletedAt != null`):** all `false`.
- **Soft-deleted model + non-admin viewer:** all `false` (per unification plan preconditions; confirm against open question on owner-of-deleted-model access).
- **Soft-deleted model + global admin:** matches whatever the unification plan resolves on its open question 1; the action test should pin the chosen behavior.

Integration: extend the existing `GET /v1/models/:id` integration test under `tests/api/` (or add `tests/api/model/model-permissions.spec.ts`) to assert:

- The `permissions` block is always present on the response.
- For an anonymous viewer on a public model: `canView=true`, every other key `false`.
- For the owner: every key `true`.
- For a non-author authenticated viewer on a public model: read actions `true`, write/admin `false`.

Equivalence between the unit test and the policy is implicit (the action map composes `policy.*`), so we don't need a separate equivalence test for actions — the unification plan's `model-access.equivalence.spec.ts` already pins the policy.

## Migration and rollout

- Depends on `[[permission-unification-plan]]`; do not merge until that lands (the action module imports `policy` and `PolicyContext`).
- Pure additive DTO change: existing frontend clients ignore the new `permissions` field. Frontend adopts on its own timeline.
- No schema change. No data migration.
- Rolls out behind one PR. The OpenAPI/Scalar docs auto-update from the Typebox schema.

If list endpoints later need permissions per row, that's a follow-up PR — does not block this one.

## Frontend contract notes

- Action keys are stable, lowerCamelCase. The frontend can use the key as the button identifier.
- Anonymous viewers always receive every `authRequired:true` action as `false` — the frontend does not need to special-case `viewer === null`.
- The action map is **authoritative**. The frontend MUST NOT re-derive permissions from `model.visibility + viewer.id`. Doing so reintroduces the drift this plan exists to eliminate.
- New actions: append to `MODEL_ACTIONS` (server) and to `modelPermissionsDtoSchema` (server) — both files in the same PR. The TypeScript compile-time check in `model-permissions.dto.ts` guards against forgetting one side.
- If the `@repo/modeling-commons-shared` package starts re-exporting backend types, `ModelActionKey` / `ModelActionMap` are good candidates — gives the frontend a typed list of action keys at zero cost. See Open Questions.

## Open questions

1. **Embed `permissions` on card DTOs?** Default: no for MVP (see "List endpoints"). Reconsider when product needs row-level Edit/Delete buttons on the model browse pages.
2. **`ModelVersion` action map.** A `canFinalize` / `canDeleteVersion` action set for `ModelVersion` routes would parallel this. Out of scope; revisit when the version UI needs gating beyond "is current draft".
3. **Share `MODEL_ACTIONS` to the frontend via `@repo/modeling-commons-shared`?** Probably yes — the frontend already imports DTO types from the backend; exporting `ModelActionKey` gives it a closed set of valid action keys for free. Flagged as a polish follow-up; not load-bearing.
4. **Banned/deleted *target* model.** Action map collapses to all-`false` for non-admin viewers because policy preconditions deny everything. For global admin, behavior depends on the unification plan's open question 1 (admin-on-soft-deleted-read). The action test should pin whatever the unification plan settles on.
5. **`canViewDrafts` action.** Lets contributors/admins see the unfinalized draft version. Defer until the draft UX is fully designed; adding it later is one-line append to `MODEL_ACTIONS`.
6. **`canRequestPermission` action.** A "request access" button on private models for anonymous/non-author viewers. Currently no such endpoint exists. Defer.

## Out of scope

- Frontend integration (consumers of the new field).
- Action maps for non-Model resources.
- A standalone `GET /v1/models/:id/permissions` endpoint.
- A batch permissions endpoint (`POST /v1/models/permissions { ids: [...] }`). Deferred until a list page demonstrably needs it.
- Recomputing `permissions` on every list row.

## Cross-links

- `[[permission-unification-plan]]` — provides `policy.{read,write,admin}`, `PolicyContext`, `ViewerContext`, `AccessLevel`. Direct dependency.
- `[[model-fork-plan]]` — `canFork` at `read` + auth.
- `[[legacy-migration-discussion-plan]]` — `canComment` at `read` + auth.
- `[[legacy-migration-reporting-plan]]` — `canReport` at `read` + auth.
- `[[legacy-migration-collaborations-plan]]` — `canManageAuthors`, `canChangePermissions`, `canTransferOwnership` at `admin`.
