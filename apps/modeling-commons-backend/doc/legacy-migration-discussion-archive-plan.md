# Legacy Migration: Discussion Archive (RO)

Bulk-import legacy `postings` rows from `nlcommons_production` into Helio as a permanent, read-only archive. Surfaces them under a separate `legacy-discussion` module so the new comment system (`[[legacy-migration-discussion-plan]]`) stays clean.

## Context

The new comment plan deliberately deferred legacy-data backfill ("That's a separate import script, out of scope here.") The product decision is now to **preserve** legacy discussions on the new site rather than abandon them — they're a meaningful part of the modelingcommons history.

Constraints, locked at scoping time:

- **Entirely separate from `model-comment`.** Two endpoints, two tables. The archive is a different product surface, not interleaved with new comments. Frontend renders them as distinct "Archive" and "Discussion" sections.
- **Read-only.** No edits, no new replies, no soft-delete toggle. Imported once, immutable. (Admin purge of an individual row stays available behind `requireRole('admin')`.)
- **Preserve Q&A flags as RO display badges.** `is_question` and `answered_at` come across so the frontend can render a "Q" / "answered" pill on those rows. Not a feature — just a visual artifact of the legacy data.
- **Soft-deleted legacy postings come in as tombstones.** `deletedAt` preserved, `body` nulled. Structural placeholders so the parent/child tree (if rendered) doesn't collapse.

Related: [[legacy-migration-discussion-plan]], [[legacy-migration-overview]].

## 1. Legacy → modern mapping

Source table: `postings` in `nlcommons_production` (Rails). Columns confirmed against `modelingcommons/db/schema.rb`.

| Legacy column     | New column / treatment                                                        |
|-------------------|--------------------------------------------------------------------------------|
| `id`              | `legacyId` (Int, `@unique`). New row gets a NanoID `id`.                        |
| `person_id`       | `userId` resolved via `User.legacyId` map. `null` if author wasn't migrated.    |
| `node_id`         | `modelId` resolved via `Model.legacyId` map. **Posting skipped if unresolved** (orphaned: model was spam-excluded or never migrated). |
| `parent_id`       | `parentLegacyPostingId` resolved via two-pass id map.                          |
| `title`           | `title` (nullable; legacy default was `'(No title)'`).                          |
| `body`            | `body`. **Nulled if `deleted_at IS NOT NULL`** — no recoverable body for tombstones. Stored as-is; legacy did `gsub!('<', '&lt;')`, so values may already be HTML-escaped. Frontend treats as preformatted text. |
| `is_question`     | `isQuestion` (bool).                                                            |
| `answered_at`     | `answeredAt` (nullable datetime).                                               |
| `deleted_at`      | `legacyDeletedAt` (nullable datetime).                                          |
| `created_at`      | `legacyCreatedAt` (datetime, required).                                         |
| `updated_at`      | `legacyUpdatedAt` (datetime, required).                                         |
| _(none)_          | `legacyAuthorName` (string, nullable) — denormalized snapshot from `people.first_name || ' ' || people.last_name` at import time so orphaned/unmapped rows still show attribution. |
| _(none)_          | `importedAt` (datetime, `@default(now())`).                                     |

## 2. Schema delta (`prisma/schema.prisma`)

One Prisma migration. Adds `LegacyModelPosting` + two back-relations.

```prisma
model LegacyModelPosting {
  id                     String   @id @default(nanoid())
  legacyId               Int      @unique
  modelId                String
  userId                 String?
  legacyAuthorName       String?
  parentLegacyPostingId  String?

  title                  String?
  body                   String?  @db.Text
  isQuestion             Boolean  @default(false)
  answeredAt             DateTime? @db.Timestamptz(3)

  legacyCreatedAt        DateTime  @db.Timestamptz(3)
  legacyUpdatedAt        DateTime  @db.Timestamptz(3)
  legacyDeletedAt        DateTime? @db.Timestamptz(3)
  importedAt             DateTime  @default(now()) @db.Timestamptz(3)

  model   Model               @relation(fields: [modelId], references: [id], onDelete: Cascade)
  user    User?               @relation(fields: [userId],  references: [id], onDelete: SetNull)
  parent  LegacyModelPosting? @relation("LegacyReplies", fields: [parentLegacyPostingId], references: [id], onDelete: Restrict)
  replies LegacyModelPosting[] @relation("LegacyReplies")

  @@index([modelId, legacyCreatedAt])
  @@index([parentLegacyPostingId])
  @@index([userId])
}
```

Back-relations to add:

```prisma
// inside model Model { ... }
legacyPostings LegacyModelPosting[]

// inside model User { ... }
legacyPostings LegacyModelPosting[]
```

Notes:

- `userId onDelete: SetNull` — admin purge of a user (GDPR) doesn't orphan the archive structure; attribution falls back to `legacyAuthorName`.
- `parent onDelete: Restrict` — refuse to delete a posting that has replies; archive integrity is the whole point. Admin purge has to walk the subtree.
- No `(modelId, legacyId)` composite uniqueness — `legacyId` is already globally unique in the source table.

## 3. Module layout

```
src/modules/legacy-discussion/
├── database/
│   ├── legacy-discussion.record.ts
│   ├── legacy-discussion.repository.port.ts
│   ├── legacy-discussion.repository.ts
│   └── legacy-discussion.repository.mock.ts
├── dtos/
│   └── legacy-posting.response.dto.ts
├── queries/
│   └── list-legacy-postings.query.ts
├── legacy-discussion.mapper.ts
├── legacy-discussion.route.ts
└── index.ts
```

Deliberately minimal:

- **No `domain/`.** This module has no domain logic — the data is frozen. The mapper handles the tombstone projection.
- **No `<module>.service.ts`.** No writes from the request path. The bulk importer lives in `prisma/legacy-migration/initial-import.ts` (see §6) and is the only writer.
- **No `patches/`.** Same reason.
- **One query** (`list-legacy-postings`) is enough; deep-link `get-legacy-posting` is in Open Questions.

## 4. Repository (`database/`)

### Port

```ts
export interface LegacyDiscussionRepository {
  findById(id: string): Promise<LegacyModelPostingEntity | undefined>;
  listByModelId(modelId: string): Promise<LegacyModelPostingEntity[]>;

  // Importer-only — exposed on the port so the seed script can DI-inject,
  // but no service / no route calls these.
  upsertManyTx(ctx: TransactionContext, rows: LegacyModelPostingEntity[]): Promise<void>;
  hardDeleteTx(ctx: TransactionContext, id: string): Promise<void>; // admin purge
}
```

- `listByModelId` returns the full flat list ordered by `legacyCreatedAt asc, legacyId asc`. Tree assembly (if needed) is a single-pass `Map` in the query handler, same shape as `model-comment`'s `list-comments-tree.query.ts` — there's no DB pagination because archive size per model is bounded and stable, and we never grow it.
- `upsertManyTx` is conflict-on-`legacyId` so the importer is idempotent — re-running picks up new legacy rows without duplicating.

### Mock

Standard `vi.fn()` shape; matches `model-comment.repository.mock.ts`.

## 5. DTOs (`dtos/legacy-posting.response.dto.ts`)

Tombstone-friendly. `body`/`userId`/`author` all nullable so the frontend renders deleted rows as placeholders.

```ts
export const legacyPostingAuthorDtoSchema = Type.Object({
  id: Type.Union([idSchema(), Type.Null()]),                           // null when unmapped
  displayName: Type.Union([Type.String(), Type.Null()]),               // legacyAuthorName fallback
  image: Type.Union([Type.String(), Type.Null()]),
});

export const legacyPostingDtoSchema = Type.Object({
  id: idSchema(),
  legacyId: Type.Integer(),
  modelId: idSchema(),
  parentLegacyPostingId: Type.Union([idSchema(), Type.Null()]),

  title: Type.Union([Type.String(), Type.Null()]),
  body: Type.Union([Type.String(), Type.Null()]),  // null on tombstones
  isQuestion: Type.Boolean(),
  answeredAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),

  legacyCreatedAt: Type.String({ format: 'date-time' }),
  legacyUpdatedAt: Type.String({ format: 'date-time' }),
  legacyDeletedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),

  author: Type.Union([legacyPostingAuthorDtoSchema, Type.Null()]),
});

export const legacyPostingListResponseDtoSchema = Type.Object({
  modelId: idSchema(),
  postings: Type.Array(legacyPostingDtoSchema),
});
```

Flat list, parent links inline. **Not** the recursive `commentTreeNodeSchema` shape — keeps the wire payload smaller, and the frontend's "Archive" view doesn't need a server-side tree (it sorts by `legacyCreatedAt` and groups by `parentLegacyPostingId` itself).

Mapper sets `body=null` and `author=null` when `legacyDeletedAt != null`. `author.id` is `null` when `userId` is unmapped; `author.displayName` falls back to `legacyAuthorName`.

## 6. Routes (`legacy-discussion.route.ts`)

| Method | Path                                            | preHandlers                            | Response                                | Notes |
|--------|-------------------------------------------------|----------------------------------------|-----------------------------------------|-------|
| GET    | `/v1/models/:modelId/legacy-discussion`         | `resolveModel('read')`                 | `200 legacyPostingListResponseDtoSchema` | Same visibility gate as the model itself. Empty array if the model has no legacy postings — never 404 on that. |
| DELETE | `/v1/admin/legacy-postings/:id`                 | `requireAuth, requireRole('admin')`    | `204`                                   | Hard-delete. Admin purge only. Refuses if the posting has replies (`onDelete: Restrict` surfaces as a 409). See Open Questions §1. |

Notes:

- **No POST / PATCH** anywhere. Surface-area discipline: the archive is data, not a feature.
- The list route piggybacks on `resolveModel('read')` instead of layering its own visibility logic. If you can't see the model, you can't see its archive. Anonymous viewers can read archives on public/unlisted models, same as they can read the model itself.

## 7. Importer (extends `prisma/legacy-migration/initial-import.ts`)

The bulk import is a new step in the existing seed script, called from `main()` after `migrateNodes` so `modelIdMap` and `userIdMap` are in scope:

```ts
console.log('→ Migrating postings → LegacyModelPosting');
await migrateLegacyPostings(modelIdMap, userIdMap);
```

Algorithm (mirrors the existing `migrateUsers` / `migrateTags` shape — streamed with `pg-cursor`, idempotent via existing-row probe):

```ts
async function migrateLegacyPostings(
  modelIdMap: Map<number, string>,
  userIdMap: Map<number, string>,
) {
  // 1. Skip already-imported rows
  const existing = await prisma.legacyModelPosting.findMany({
    select: { legacyId: true, id: true },
  });
  const seenLegacyId = new Map<number, string>();
  for (const r of existing) seenLegacyId.set(r.legacyId, r.id);

  // 2. Load people display names once — cheap, table is small.
  //    Used as legacyAuthorName fallback regardless of whether the user mapped.
  const { rows: peopleRows } = await oldPool.query<{
    id: number; first_name: string | null; last_name: string | null;
  }>(`SELECT id, first_name, last_name FROM people`);
  const legacyAuthorName = new Map<number, string>();
  for (const p of peopleRows) {
    const n = [p.first_name, p.last_name].map((s) => (s ?? '').trim()).filter(Boolean).join(' ');
    if (n) legacyAuthorName.set(p.id, n);
  }

  // 3. Two-pass import to resolve parent links.
  //    Pass 1: insert every posting with parentLegacyPostingId = null.
  //    Pass 2: update parent links once all id mappings exist.

  const idMap = new Map<number, string>(seenLegacyId); // legacy posting id → new id

  await streamRows<OldPosting>(
    `SELECT id, person_id, node_id, parent_id, title, body,
            is_question, deleted_at, answered_at, created_at, updated_at
     FROM postings
     ORDER BY id ASC`,
    async (batch) => {
      const rows: Prisma.LegacyModelPostingCreateManyInput[] = [];
      for (const p of batch) {
        if (idMap.has(p.id)) {
          report.legacyPostings.skipped_existing++;
          continue;
        }
        if (!p.node_id) { report.legacyPostings.skipped_orphan_model++; continue; }
        const modelId = modelIdMap.get(p.node_id);
        if (!modelId) { report.legacyPostings.skipped_orphan_model++; continue; }

        const userId = p.person_id ? userIdMap.get(p.person_id) ?? null : null;
        const authorName = p.person_id ? legacyAuthorName.get(p.person_id) ?? null : null;

        const isDeleted = p.deleted_at !== null;
        const id = newId();
        rows.push({
          id,
          legacyId: p.id,
          modelId,
          userId,
          legacyAuthorName: authorName,
          parentLegacyPostingId: null, // pass 2 sets this
          title: p.title,
          body: isDeleted ? null : p.body,
          isQuestion: p.is_question,
          answeredAt: p.answered_at,
          legacyCreatedAt: p.created_at ?? new Date(0),
          legacyUpdatedAt: p.updated_at ?? p.created_at ?? new Date(0),
          legacyDeletedAt: p.deleted_at,
        });
        idMap.set(p.id, id);
      }
      if (rows.length > 0) {
        await prisma.legacyModelPosting.createMany({ data: rows, skipDuplicates: true });
        report.legacyPostings.migrated += rows.length;
      }
    },
  );

  // Pass 2: resolve parent links
  const { rows: parented } = await oldPool.query<{ id: number; parent_id: number | null }>(
    `SELECT id, parent_id FROM postings WHERE parent_id IS NOT NULL`,
  );
  for (const p of parented) {
    const childId = idMap.get(p.id);
    const parentId = p.parent_id ? idMap.get(p.parent_id) ?? null : null;
    if (!childId || !parentId) {
      report.legacyPostings.skipped_orphan_parent++;
      continue;
    }
    await prisma.legacyModelPosting.update({
      where: { id: childId },
      data: { parentLegacyPostingId: parentId },
    });
  }
}
```

Idempotency:

- Re-running the seed picks up new legacy rows (none expected: legacy DB is frozen, but the script supports it). Existing rows are skipped via the `legacyId` probe in pass 1; pass 2's update is no-op-safe (same parent id).
- `WIPE_TARGET=true` already truncates the right cascade; add `"LegacyModelPosting"` to the truncate list in `wipeTarget`.

Report counters to add to the existing `report` object in `initial-import.ts`:

```ts
legacyPostings: {
  migrated: 0,
  skipped_existing: 0,
  skipped_orphan_model: 0,
  skipped_orphan_parent: 0,
}
```

Type addition:

```ts
type OldPosting = {
  id: number;
  person_id: number | null;
  node_id: number | null;
  parent_id: number | null;
  title: string | null;
  body: string | null;
  is_question: boolean;
  deleted_at: Date | null;
  answered_at: Date | null;
  created_at: Date | null;
  updated_at: Date | null;
};
```

## 8. Events

**None emitted from request paths** — the only write endpoint is admin purge, and that's a deliberate destructive action better captured as a single `legacy_posting.purged` event:

| `type`                   | `actorId`    | `resourceType` / `resourceId`   | `payload`                          |
|--------------------------|--------------|----------------------------------|------------------------------------|
| `legacy_posting.purged`  | admin user   | `model` / `posting.modelId`      | `{ legacyPostingId, legacyId }`    |

Bulk import does **not** emit per-row events. Operator-side, the seed script's existing report.json output is the audit trail. (If anyone wants a single `legacy_postings.imported_batch` event with summary counts, easy to add — see Open Questions §3.)

## 9. DI registrations (`src/modules/legacy-discussion/index.ts`)

```ts
declare global {
  export interface Dependencies {
    legacyDiscussionRepository: LegacyDiscussionRepository;
    legacyDiscussionMapper:     Mapper<LegacyModelPostingEntity, LegacyModelPostingRecord, LegacyPostingDto>;
    listLegacyPostingsQuery:    ReturnType<typeof import('./queries/list-legacy-postings.query.ts').default>;
  }
}
```

Awilix auto-loads by filename. No service to register.

## 10. Tests

### Unit

- **`legacy-discussion.mapper.spec.ts`**
  - Non-deleted entity → full DTO; body present; author resolved.
  - Tombstone entity (`legacyDeletedAt` set) → `body: null`, `author: null` (even if `userId`/`legacyAuthorName` set).
  - Orphaned user (`userId = null`, `legacyAuthorName = 'Alice Author'`) → `author: { id: null, displayName: 'Alice Author', image: null }`.
  - Fully orphaned (`userId = null`, `legacyAuthorName = null`) → `author: { id: null, displayName: null, image: null }`. Frontend renders "Unknown user".

- **`list-legacy-postings.query.spec.ts`** (uses repository mock)
  - Returns rows in `(legacyCreatedAt asc, legacyId asc)` order regardless of input order.
  - Empty array if model has no archive — no throw.

### Integration (`tests/integration/legacy-discussion.test.ts`)

- Seed: one public model, three legacy postings (one top-level, one reply, one soft-deleted reply).
- `GET /v1/models/:id/legacy-discussion` → 200, three rows, the soft-deleted one has `body: null, author: null, legacyDeletedAt` populated, parent links intact.
- Same endpoint against a private model the caller can't see → 404 (from `resolveModel`).
- `DELETE /v1/admin/legacy-postings/:id` on a posting with a reply → 409 (FK Restrict, ConflictException).
- `DELETE` on a leaf as admin → 204, subsequent `GET` no longer lists it, `Event` row with type `legacy_posting.purged`.
- `DELETE` as non-admin → 403.

### Importer

- **`prisma/legacy-migration/legacy-postings.spec.ts`** (heavy; gated behind an integration flag because it touches the legacy DB)
  - Seed a small `postings` fixture in a test legacy DB; run the import step; assert row counts, parent links, tombstone bodies, orphan-skip behavior.
  - Re-run the import; assert `skipped_existing` increments and no duplicates appear.

## 11. Open questions

1. **Admin purge endpoint.** Worth shipping? It's 20 lines and useful for the inevitable "Person X wants their legacy comment gone." Recommend yes for MVP; the alternative (direct DB DELETE) bypasses event audit. If we keep it, the 409-on-reply behavior pushes the moderator toward soft-purging the subtree by hand — adequate at archive scale.
2. **Body sanitization on import.** Legacy bodies have ad-hoc `<` → `&lt;` escaping baked in. Two choices:
   - Store as-is, frontend renders as preformatted text (current plan).
   - Run a one-time unescape pass during import so bodies match modern markdown conventions.
   Recommend store-as-is. Surprise edits to historical content read worse than slightly off-looking HTML escapes.
3. **`legacy_postings.imported_batch` event.** Optional. If we want a single audit-table breadcrumb per import run, the seed script can emit one row (`actorId` = a fixed system user or null — need to pick). Defer; the seed's report.json is enough today.
4. **Anonymous access on public models.** Currently a `resolveModel('read')` decision: anonymous viewers can see archives on public/unlisted models, same as they can see the model. Confirm with product that this is fine — the legacy site was effectively the same. No spec change unless someone objects.
5. **What if a model is later soft-deleted?** Postings cascade-delete because the FK is `onDelete: Cascade` on `modelId`. That's correct — the model going away takes the archive with it. If we later want "archive-only" persistence after model deletion, change to `SetNull` on `modelId` and surface orphans under a separate route. Out of scope for now.
6. **Threading UX.** Plan assumes the frontend can choose to render the flat-with-parent-links payload as a tree if it wants. Whether legacy threading was ever exposed in the original site is unknown ([[legacy-migration-discussion-plan]] notes "controller doesn't expose threading UI"). The data carries `parent_id` regardless; we preserve it.
7. **Profile linking on imported attribution.** When `userId` resolves, frontend can deep-link to the user's profile. When only `legacyAuthorName` is present, it's plain text. Possibly add `legacyAuthorEmail` (hashed?) to support email-based "claim my legacy posts" flow later — speculative, not in MVP.

## 12. Out of scope

- Any write path beyond admin purge. No edits, no replies, no soft-delete toggle, no Q&A status changes.
- Frontend rendering, archive surfacing in search results, in-app notifications about imported content.
- Importing other legacy resources (collaborations, spam warnings, anything else). Each has its own plan if/when that scope opens.
- Backfilling `Event` table with per-posting "created" events. The archive is data, not history of action.
- Deduplicating archive postings against new comments. Different surfaces, never compared.
- Migration of comments-on-comments deeper than `parent_id` allows — the legacy schema only models single-level threading via the same column.

## 13. Sequencing

- **No dependency on `[[legacy-migration-discussion-plan]] / model-comment` landing first.** This module is independent.
- **Does depend on `prisma/legacy-migration/initial-import.ts` Users/Models import** for the `userIdMap` / `modelIdMap`. Already in place — postings just get a new step downstream of those.
- Land order, if both this plan and `model-comment` are picked up: either order is fine; they don't touch each other.

## 14. References

- Legacy schema: `/Users/pas6148/Documents/netlogo/modelingcommons/db/schema.rb` (lines 240–259 — `postings` table).
- Legacy model: `/Users/pas6148/Documents/netlogo/modelingcommons/app/models/posting.rb`.
- Existing importer: `apps/modeling-commons-backend/prisma/legacy-migration/initial-import.ts` (extends in §7).
- Mirror module shape: `src/modules/model-author/` (smallest existing module skeleton).
- Cross-link: [[legacy-migration-discussion-plan]] (the active comment system).
