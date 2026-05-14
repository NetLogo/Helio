# Model permission unification plan

## Framing

This is a refactor, not a feature. Two pieces of code answer the same question — "can this viewer act on this Model at level X?" — and they answer it differently:

1. The route preHandler `resolveModel(level)` in `src/shared/hooks/resolve-model.ts`, which loads the Model and calls `permissionService.check(userId, model, level)` (see `src/modules/model-permission/permission.service.ts`).
2. The Prisma `where` builder `buildModelWhere(filters, userId)` in `src/modules/model/database/model.search.ts`, used by `modelRepository.search` for list/card search.

These have already drifted. A concrete example: a viewer has a `ModelPermission` row with `permissionLevel='read'` on a private model.
- The detail route `GET /v1/models/:id` calls `resolveModel('read')` → `permissionService.check` → returns `true`. Detail succeeds.
- A `write` preHandler on the same model also calls `permissionService.check('write')`. Service correctly rejects (the explicit grant is `read`, `meetsLevel('read', 'write')` is false). Write rejected.
- But `buildModelWhere` does **not** look at `permissionLevel` at all. It only checks `permissions: { some: { granteeUserId: userId } }`. So in any *list* result, this viewer appears as if they have full access to the model — including admin list endpoints if any are built on top of `modelRepository.search`. List leaks more than detail allows.

The reverse drift exists for `unlisted` + anonymous: `permissionService.check` allows anonymous read of `unlisted`; `buildModelWhere` with `userId=null` restricts to `visibility: 'public'`, so unlisted models never surface in any list — even though the policy considers them readable. Detail allows what list hides.

The plan introduces a single source of truth: `src/shared/permissions/model-access`. It exposes parallel TS-predicate and Prisma-`where` implementations, derived from the same canonical rule table, with an equivalence property test that fails the build if they ever disagree again.

## Scope

In scope:

- The route preHandler (`resolveModel`).
- The SQL predicate for Model lists (`buildModelWhere` and ad-hoc Model `where` clauses inside `src/modules/model/queries/`).
- Three access levels: `read | write | admin`. Same trio as today (`src/modules/model-permission/domain/permission.types.ts`).
- Resource scope: **Model only**. Child resources (`ModelVersion`, `ModelLike`, `ModelPermission`, `ModelInteraction`, `ModelVersionTag`) already delegate access to the parent via `resolveModel('read' | 'write' | 'admin')` in their routes — they pick up the new behavior automatically.

Out of scope (kept where they are):

- Service-level domain assertions (`assertCallerIsOwner`, `assertNotDeleted`, fork eligibility checks, etc.). These are small, aggregate-specific, and don't suffer from drift.
- Other resources' own policies (User self-edit, ModelComment edit, ModelReport triage, ...). None exist yet at the level of complexity that justifies centralization.
- A generic `AccessPolicy<T>` interface — premature, only one resource needs unification right now.
- A raw-SQL `buildAccessSql` helper. The current code is 100% Prisma. When the FTS endpoint described in `[[legacy-migration-search-spec]]` lands, it will need a raw-SQL counterpart; see the FTS follow-up note at the bottom.

## Canonical access rules

This is the artifact every future reader checks against. Inputs:

- `viewer: { id: string; systemRole: 'admin' | 'moderator' | 'user'; banned: boolean; deletedAt: Date | null } | null` (null = anonymous)
- `model: { id: string; visibility: 'public' | 'private' | 'unlisted'; deletedAt: Date | null }`

Implicit context, looked up from DB:

- Is viewer the model owner? — `ModelAuthor` row with `role='owner'`.
- Is viewer a contributor? — `ModelAuthor` row with `role='contributor'`.
- Does viewer have an explicit grant? — `ModelPermission` row with `granteeUserId=viewer.id`, level compared via `meetsLevel` (`src/modules/model-permission/domain/permission.types.ts`).
- Is viewer a global admin? — `User.systemRole='admin'` (see `enum SystemRole` in `prisma/schema.prisma:18`).

Hard preconditions, evaluated first at every level:

- If `viewer` is non-null and `viewer.banned === true` → deny all. (See Open Questions — confirm where this check should live; today it is nowhere.)
- If `viewer` is non-null and `viewer.deletedAt !== null` → deny all.
- If `model.deletedAt !== null` → deny everything **except** global admin (`systemRole='admin'`). Current `permissionService.check` allows the *owner* to keep access to a soft-deleted model; this is a drift to reconcile (see Open Questions).

Level matrix (assuming preconditions passed):

| Level | Allowed if any of |
|---|---|
| `read`  | `model.visibility ∈ {public, unlisted}`; viewer is owner; viewer is contributor; viewer has `ModelPermission` with `meetsLevel(grant, 'read')`; viewer is global admin. |
| `write` | viewer is owner; viewer is contributor; viewer has `ModelPermission` with `meetsLevel(grant, 'write')`; viewer is global admin. |
| `admin` | viewer is owner; viewer has `ModelPermission` with `meetsLevel(grant, 'admin')` (i.e. `permissionLevel='admin'`); viewer is global admin. |

Notes derived from reading `permission.service.ts` and `model.search.ts`:

- `unlisted` behaves identically to `public` at `read` (rule: "anyone with the link can view, but excluded from search results"). The "excluded from search results" rule is a *filter concern*, not an access concern — see Open Questions for whether `accessibleModelsWhere('read')` should exclude `unlisted` for non-author anonymous viewers, or whether the search route should layer that filter on top.
- Contributors get `read` + `write` but **not** `admin`. Current `permissionService.check` matches this; current `buildModelWhere` is silent on it.
- Global-admin override is **not** implemented in `permissionService.check` today. The unified module adds it. This is a behavior change to flag in the PR description.

## File layout

`src/shared/permissions/`:

- `model-access.types.ts` — shared types: `AccessLevel` (re-exports `PermissionLevel`), `ViewerContext` (the subset of `User` needed for policy evaluation: `id`, `systemRole`, `banned`, `deletedAt`), `ModelAccessSubject` (the subset of `Model` needed: `id`, `visibility`, `deletedAt`).
- `model-access.policy.ts` — pure TS predicates over fully-loaded inputs. Signatures in the next section.
- `model-access.where.ts` — Prisma `where` builders. Returns a `Prisma.ModelWhereInput` that callers `AND` into their own filters.
- `model-access.viewer.ts` — small helper `loadViewer(db, userId): Promise<ViewerContext | null>`; centralizes the select shape so route preHandlers, queries, and tests load the same fields.
- `index.ts` — barrel.

Tests live as siblings:

- `model-access.policy.spec.ts` — unit, pure function matrix.
- `model-access.where.spec.ts` — integration against a seeded DB.
- `model-access.equivalence.spec.ts` — property test asserting predicates ≡ where clauses.

Reasoning for the location: this is cross-cutting infrastructure, not a DDD aggregate. It has no entities, no repository, no events. Putting it in `src/modules/model-access/` would imply a module skeleton it does not need. `src/shared/` is the right home (peers: `src/shared/hooks/`, `src/shared/exceptions/`, `src/shared/db/`).

## Policy module (TS predicates)

```ts
// model-access.policy.ts
export type PolicyContext = {
  viewer: ViewerContext | null;
  model: ModelAccessSubject;
  ownerRole: AuthorRole | null;          // null if no ModelAuthor row
  grantLevel: PermissionLevel | null;    // null if no ModelPermission row
};

export function canRead(ctx: PolicyContext): boolean;
export function canWrite(ctx: PolicyContext): boolean;
export function canAdmin(ctx: PolicyContext): boolean;

export const policy = { read: canRead, write: canWrite, admin: canAdmin } as const;
```

Predicates are pure: they take a fully-loaded `PolicyContext` and decide. The repository call to load `ownerRole` and `grantLevel` lives in a thin async wrapper used by the route preHandler:

```ts
// route preHandler wrapper, in resolve-model.ts
export function resolveModel(level: AccessLevel): preHandlerHookHandler {
  return async (request) => {
    const { id } = request.params as { id: string };
    const { db, permissionRepository, loadViewer } = request.server.diContainer.cradle;

    const model = await db.model.findUnique({
      where: { id },
      select: { id: true, visibility: true, deletedAt: true },
    });
    if (!model) throw new NotFoundException('Model not found');

    const viewer = await loadViewer(request.user?.id ?? null);
    const [author, grant] = viewer
      ? await Promise.all([
          permissionRepository.findAuthor(model.id, viewer.id),
          permissionRepository.findByModelAndUser(model.id, viewer.id),
        ])
      : [null, null];

    const allowed = policy[level]({
      viewer,
      model,
      ownerRole: author?.role ?? null,
      grantLevel: grant?.permissionLevel ?? null,
    });

    if (!allowed) {
      // For anonymous-or-non-owner viewers on a private model at level=read,
      // throw NotFoundException to avoid leaking existence. All other denials
      // throw ForbiddenException. Match current behavior in resolve-model.ts.
      const hideExistence =
        level === 'read' && model.visibility === 'private' && (author?.role ?? null) === null;
      if (hideExistence) throw new NotFoundException('Model not found');
      throw new ForbiddenException(/* same message as today */);
    }

    request.model = model;
  };
}
```

Exception classes used (`src/shared/exceptions/exceptions.ts`):

- `NotFoundException` (404)
- `ForbiddenException` (403)

Today `resolveModel` always throws `ForbiddenException` on deny — see Open Questions for whether the hide-existence behavior should be added now or deferred.

## Where module (SQL predicates)

```ts
// model-access.where.ts
export function accessibleModelsWhere(
  viewer: ViewerContext | null,
  level: AccessLevel,
): Prisma.ModelWhereInput;
```

The result is an `AND`-able `Prisma.ModelWhereInput`. Callers do:

```ts
const where: Prisma.ModelWhereInput = {
  AND: [
    accessibleModelsWhere(viewer, 'read'),
    // ...caller's own filters (parentModelId, isEndorsed, keyword, tag, ...)
  ],
};
```

Shape at each level (illustrative; the actual code derives these from the same constants as the policy):

```ts
// level = 'read'
// global-admin short-circuit:
viewer?.systemRole === 'admin' && !viewer.banned && !viewer.deletedAt
  ? {}
  : {
      AND: [
        { deletedAt: null },
        viewer && !viewer.banned && !viewer.deletedAt
          ? {
              OR: [
                { visibility: { in: ['public', 'unlisted'] } },
                { authors: { some: { userId: viewer.id } } },
                {
                  permissions: {
                    some: { granteeUserId: viewer.id }, // any grant suffices for read
                  },
                },
              ],
            }
          : { visibility: { in: ['public', 'unlisted'] } },
      ],
    };

// level = 'write'
viewer?.systemRole === 'admin' && !viewer.banned && !viewer.deletedAt
  ? { deletedAt: null }   // admin can write any non-deleted, plus deleted (see below)
  : viewer && !viewer.banned && !viewer.deletedAt
    ? {
        AND: [
          { deletedAt: null },
          {
            OR: [
              { authors: { some: { userId: viewer.id } } }, // owner or contributor
              {
                permissions: {
                  some: {
                    granteeUserId: viewer.id,
                    permissionLevel: { in: ['write', 'admin'] }, // meetsLevel(_, write)
                  },
                },
              },
            ],
          },
        ],
      }
    : { id: '__never__' };  // anonymous can never write

// level = 'admin'
viewer?.systemRole === 'admin' && !viewer.banned && !viewer.deletedAt
  ? {}
  : viewer && !viewer.banned && !viewer.deletedAt
    ? {
        AND: [
          { deletedAt: null },
          {
            OR: [
              { authors: { some: { userId: viewer.id, role: 'owner' } } },
              {
                permissions: {
                  some: { granteeUserId: viewer.id, permissionLevel: 'admin' },
                },
              },
            ],
          },
        ],
      }
    : { id: '__never__' };
```

Two things to call out:

1. The `id: '__never__'` impossible-match pattern is the standard Prisma trick to short-circuit a `findMany` to zero rows while remaining `AND`-composable. (Alternative: return `{ AND: [{ id: { equals: '' } }] }`.)
2. Admin-on-deleted: the matrix admits global admin to read/write deleted models. The `where` above for `write` keeps `deletedAt: null` for admins by default. If we want admins to mutate soft-deleted models via list endpoints, drop that constraint. See Open Questions.

## Equivalence invariant

For every `(viewer, model, level)`:

```
policy[level]({ viewer, model, ownerRole, grantLevel })
  === !!(await db.model.findFirst({
    where: { AND: [{ id: model.id }, accessibleModelsWhere(viewer, level)] },
  }))
```

where `ownerRole` and `grantLevel` are loaded from the same `ModelAuthor` / `ModelPermission` tables that the `where` joins against. This is the load-bearing guarantee. The equivalence test (below) fuzzes a small matrix and asserts both sides agree.

## Migration of existing call sites

Discovered by `grep -rn "resolveModel\|buildModelWhere\|visibility:\|deletedAt: null" src/`. Each file + the specific change:

| File | Change |
|---|---|
| `src/shared/hooks/resolve-model.ts` | Rewrite to call `policy[level](...)`. Drop the inline `permissionService` type cast (the cast at line 9-17 only exists because of the awilix typing gap). Keep `request.model = model` attachment. |
| `src/modules/model-permission/permission.service.ts` | `check()` stays for now (other call sites may rely on it; see below). Re-implement its body as `policy[level](...)` so the two stay equivalent during the rollout, then delete in phase 2 if no other caller depends on it. Today the only caller is `resolve-model.ts`, so it can likely be deleted outright. |
| `src/modules/model-permission/database/permission.repository.ts` | Keep `findAuthor` and `findByModelAndUser`; the new preHandler reuses them. No changes. |
| `src/modules/model/database/model.search.ts` | Replace the visibility/authors/permissions block (lines 10-27) with `accessibleModelsWhere(viewer, 'read')`. The `publicOnly` filter becomes `viewer = null` for that call, OR is dropped entirely (see Open Questions: `publicOnly` may be redundant once access is unified). The rest of `buildModelWhere` — `parentModelId`, `isEndorsed`, `isLibraryModel`, `authorId`, `tags`, `netlogoVersion`, `keyword`, `fromDate/toDate` — stays as caller-side filters, `AND`-ed with the access clause. |
| `src/modules/model/database/model.search.spec.ts` | Update the visibility tests (lines 16-44) to assert the *access clause* is `accessibleModelsWhere(...)`. The other filter tests are unchanged. |
| `src/modules/model/database/model.repository.ts` (line 90) | `modelRepository.search` continues to call `buildModelWhere`; only the implementation changes. **However**: `search`'s signature today is `(filters, params, userId, options)`. Change to `(filters, params, viewer, options)` so the access clause sees `systemRole`/`banned`/`deletedAt` not just an id. All callers pass a viewer instead of a userId. |
| `src/modules/model/database/model.repository.ts:findCard` (line 149-153) | Currently `{ id: modelId, deletedAt: null }`. The route preHandler `resolveModel('read')` already gates this, so the SQL doesn't need to re-check. Keep `deletedAt: null` defensively. No structural change. |
| `src/modules/model/database/model.repository.ts:findChildren` (line 156-172) | Today: `{ parentModelId, deletedAt: null }`. **Drift**: this returns children regardless of viewer access. Update to `{ AND: [{ parentModelId: modelId }, accessibleModelsWhere(viewer, 'read')] }`. Change signature to accept a viewer. |
| `src/modules/model/database/model.repository.ts:findRandomPublic` (line 182-198) | Keep as-is: explicitly named "Public", intentionally restricted to public models. Optionally rewrite the body as `{ AND: [{ latestVersionNumber: { not: null } }, accessibleModelsWhere(null, 'read')] }` for consistency, since `accessibleModelsWhere(null, 'read')` is equivalent to `{ visibility: { in: ['public', 'unlisted'] }, deletedAt: null }`. **But**: that would change behavior to include `unlisted` in the random pick; current code is `public` only. See Open Questions. |
| `src/modules/model/queries/search-models.query.ts` | Change `userId: string \| null` → `viewer: ViewerContext \| null`. Route layer calls `loadViewer(request.user?.id ?? null)` once and passes it through. |
| `src/modules/model/queries/search-models-card.query.ts` | Same as above. |
| `src/modules/model/queries/get-model-card.query.ts` | No change to access logic; this is called *after* `resolveModel('read')` so the gate is already enforced. The `viewerUserId` parameter is used only for `likedByMe`, unrelated. |
| `src/modules/model/queries/get-model-children.query.ts` | Threads viewer through to `modelRepository.findChildren(modelId, viewer, params)` per the repo change above. |
| `src/modules/model/queries/get-model-family-card.query.ts` | **Drift surface**. Currently the parent/sibling/children queries (lines 64-87) use `{ deletedAt: null }` only — they leak `private` models into the family graph regardless of viewer. Each `db.model.findFirst/findMany` call needs `{ AND: [<existing where>, accessibleModelsWhere(viewer, 'read')] }`. The query function gains a `viewer` parameter. Route layer (`model.route.ts:181`) is already `[resolveModel('read')]` on the subject; the family graph endpoint itself must pass the viewer in. |
| `src/modules/model/model.route.ts` | Each handler that calls a query: load the viewer once via `loadViewer(request.user?.id ?? null)` and pass it to the query. Routes that already use `resolveModel('read')` can read the resolved Model off `request.model` and skip re-loading. |
| `src/modules/model-version/model-version.route.ts`, `model-like.route.ts`, `model-interaction.route.ts`, `model-permission/permission.route.ts`, `model-version-tag.route.ts` | No changes needed. They use `resolveModel(level)` and inherit the new policy. |
| `src/modules/model-permission/permission.service.spec.ts` | Update mock expectations if `permissionService.check` is rewritten as a thin wrapper around the policy. If `check` is deleted, delete this spec section. |

Awilix wiring (`src/shared/permissions/index.ts` or co-located): register `loadViewer` (or expose it as a static import — it's stateless and only needs `db`, so a function that takes `db` is fine; register only if DI is more ergonomic). The policy and where modules are pure functions, no registration needed.

## Rollout

Single PR, two phases:

1. **Land the new module.** Add `src/shared/permissions/{model-access.policy.ts, model-access.where.ts, model-access.types.ts, model-access.viewer.ts, index.ts}` plus all three spec files. The old `permissionService.check` and `buildModelWhere` keep working. Run the equivalence test against both old and new where clauses; expect the old where to fail the equivalence in the documented drift cases (and that's fine — the test is asserting against the new implementations).

2. **Migrate call sites.** Apply every row in the table above. Delete `permissionService.check` if no callers remain. Replace the body of `buildModelWhere` with `accessibleModelsWhere(viewer, 'read')` + caller filters, or inline the call at the two `modelRepository.search`/`findChildren` sites and delete `buildModelWhere`.

No data migration. No schema change. No new Prisma migration.

## Tests

Existing test scaffolding: `vitest` is the runner. Spec files sit next to source (`*.spec.ts`). Integration test helpers in `tests/support/` (db-helper, server, auth-helper, common-hooks).

**`model-access.policy.spec.ts`** — pure unit. Matrix:

- Viewer states: `null`, banned, deleted, plain user, owner, contributor, granted-read, granted-write, granted-admin, global admin (`systemRole='admin'`).
- Model states: `public`, `private`, `unlisted`, soft-deleted (each visibility × deleted).
- Levels: `read`, `write`, `admin`.

That's ~10 × 6 × 3 = 180 cells. Encode as a table-driven test with explicit expected booleans; readers should be able to scan the table and audit the rules at a glance.

**`model-access.where.spec.ts`** — integration. Same matrix; seeds a `Model`, optionally a `ModelAuthor`, optionally a `ModelPermission`, and runs:

```ts
const found = await db.model.findFirst({
  where: { AND: [{ id: seededId }, accessibleModelsWhere(viewer, level)] },
});
expect(!!found).toBe(expected);
```

Uses `tests/support/db-helper.ts` for setup/teardown.

**`model-access.equivalence.spec.ts`** — the load-bearing test. Generates ~50 random `(viewer, model, ownerRole, grantLevel)` tuples (fast-check or a hand-rolled seeded RNG; no new dep needed if vitest's matchers are enough). For each, asserts:

```ts
expect(policy[level]({ viewer, model, ownerRole, grantLevel }))
  .toBe(!!(await db.model.findFirst({ where: { AND: [{ id: model.id }, accessibleModelsWhere(viewer, level)] } })));
```

For each of `read | write | admin`. If this test ever goes red, drift is back; the failure message names the exact tuple.

A complementary route-level integration test (`tests/api/.../model-access.spec.ts`) hits `GET /v1/models/:id`, `GET /v1/models?...`, `GET /v1/models/:id/children`, `GET /v1/models/:id/family` with a small fixture set (public model + private model + unlisted model + 1 owner + 1 contributor + 1 grantee + 1 admin + 1 anonymous) and asserts the response shapes agree (detail-allowed ⇔ id present in list).

## Open questions and decisions

Each must be resolved in the PR description before merge. None are blockers for drafting the module; they're behavior choices, not architecture.

1. **Admin override on soft-deleted models.** Should `canRead`/`canWrite` return `true` for `systemRole='admin'` against a `deletedAt != null` model? Current `permissionService.check` says: only the *owner* keeps access after soft-delete, and admin override is not implemented at all. Recommendation: yes for read (admin tooling needs to see deleted models), no for write by default (operators recover via direct DB / a dedicated restore endpoint, not list endpoints).

2. **Owner access to soft-deleted models.** `permissionService.check` currently grants the owner read on soft-deleted models. Keep or drop? Recommendation: keep — owners may want to undelete via a future endpoint, and the alternative (the model just vanishes from their dashboard) is a worse UX. Codify in `canRead`.

3. **`unlisted` semantics in search results.** Policy says `unlisted` is readable by anyone. But the original semantic is "not in search results, link-only". Should `accessibleModelsWhere('read')` for an anonymous viewer include `unlisted`, with the *search route* layering a `{ visibility: { not: 'unlisted' } }` filter on top? Or should the access helper itself exclude `unlisted` for non-author viewers? Recommendation: keep the access helper inclusive (matches detail-route behavior), and add an explicit `{ visibility: { not: 'unlisted' } }` to the search route's filter set. This keeps "access" and "discoverability" as separate concerns.

4. **Banned users.** `User.banned: Boolean?` exists on the schema (line 88). `requireAuth` does **not** check it (see `src/shared/hooks/require-auth.ts`). Decision: add the banned check to `loadViewer` — if banned, return `null` or a sentinel. Easier than threading it into every predicate. Document this in `model-access.viewer.ts`. Out-of-scope follow-up: a `requireNotBanned` hook for write routes that don't go through `resolveModel`.

5. **Anonymous viewers and `unlisted`.** Per (3): yes, anonymous viewers can read unlisted via direct link. Confirmed against current `permissionService.check` behavior.

6. **`publicOnly` filter.** The `ModelSearchFilters.publicOnly` flag becomes ambiguous once access is unified. Today it forces `visibility: 'public'` regardless of viewer. Is this an authorization concern (then it disappears, replaced by `viewer=null` passed to `accessibleModelsWhere`) or a discoverability filter (then it survives as a UI-controlled toggle)? Recommendation: keep `publicOnly` as a UI filter, distinct from access. Document the distinction in the search DTO.

7. **`findRandomPublic` and `unlisted`.** Currently strictly `visibility='public'`. If `unlisted` is "link-only", random pick should not surface unlisted models (they're meant to be unfindable). Recommendation: keep the literal `visibility: 'public'` here and *do not* rewrite using `accessibleModelsWhere`. Add a comment noting the deliberate divergence.

8. **Index coverage for `permissions: { some: { granteeUserId, permissionLevel } }`.** Schema (`prisma/schema.prisma:300-302`) has `@@unique([modelId, granteeUserId])` and `@@index([granteeUserId])`. Adequate for the `read` level (single column on `granteeUserId`). For `write`/`admin`, the predicate adds `permissionLevel IN (...)` — Postgres will still use the `granteeUserId` index then filter in-memory; row counts per user are small (a user has a few model grants), so no index change needed. Same logic for `authors: { some: { userId, role } }` — schema has `@@id([modelId, userId])` and `@@index([userId])`. Fine.

9. **`request.user` shape.** `loadViewer` should not assume `request.user.systemRole` is loaded by better-auth. Verify in `src/server/plugins/` what better-auth attaches; if it only attaches `id`, `loadViewer` fetches the rest from `User`. (If `systemRole`/`banned`/`deletedAt` are already on `request.user`, `loadViewer` becomes a synchronous projection.)

## Cross-links

- `[[legacy-migration-search-spec]]` — FTS endpoint will need `buildAccessSql(viewer, level, tableAlias): { sql: string; params: unknown[] }` alongside `accessibleModelsWhere`. Same canonical rules, raw-SQL serialization. Defer to that plan; do not add it speculatively here.
- `[[legacy-migration-fork-graph-plan]]` — has a TODO around ancestor-visibility filtering. Once `accessibleModelsWhere` exists, ancestor traversal queries can compose it directly.
- `[[legacy-migration-fork-patch-plan]]` — fork creation reads the parent via `resolveModel('read')`; benefits automatically.
