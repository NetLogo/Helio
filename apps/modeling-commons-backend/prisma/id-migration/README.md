# One-pass id migration

Rewrites every UUID and cuid primary key in an existing database to a NanoID,
follows every reference to it, and moves the storage objects whose keys embed
one. Run it once, during a maintenance window, after the NanoID code has been
deployed.

```
yarn db:ids:migrate --dry-run     # plan only, writes nothing
yarn db:ids:migrate               # prompts before touching anything
yarn db:ids:migrate --verify-only # re-check a finished run
```

Flags: `--dry-run`, `--yes`, `--skip-storage`, `--verify-only`, `--drop-map`.

## Before running

1. Take a full database backup and a bucket snapshot. There is no undo.
2. Stop the application. The script takes `ACCESS EXCLUSIVE` locks on every
   table and rewrites ids that in-flight requests are holding.
3. Rehearse against a restored copy of the dump first.

Every user is logged out, because `Session.id` and `User.id` both change.
Externally shared model URLs stop resolving. **Every unpublished draft is
deleted**, along with its uploads. All three are intended and belong in the
release notes.

## What it does, in order

1. **Map.** Assigns a new id to every row whose id is not already a NanoID and
   stores the pairs in `_id_migration_map`, plus a JSON copy under `output/`.
   Drafts are skipped, because they are purged rather than migrated.
2. **Copy.** Copies each affected storage object to its new key, leaving the
   original in place. Object metadata carries a `userId` that is remapped in
   the same call. Draft uploads are not copied.
3. **Swap.** In one transaction: delete every draft, drop every foreign key,
   rewrite the ids, rewrite the soft references, then recreate the foreign
   keys.
4. **Delete.** Removes the superseded storage objects and the whole staging
   tree.
5. **Verify.** Re-reads every column and re-lists the bucket, and fails the run
   if any mapped old id survives.

Copy and delete straddle the transaction on purpose. Until the swap commits,
every original object is still where the unmigrated rows expect it.

## Why the foreign keys are dropped

Every foreign key in the schema is `ON UPDATE CASCADE`, so updating a parent
key does propagate. Relying on that here would not be safe: `Model.id` is both
a primary key and the referencing half of
`Model(id, latestVersionNumber) -> ModelVersion(modelId, versionNumber)`.
Updating it fires a check on the row and a cascade on the referenced table in
the same statement, and which of the two runs first depends on constraint
creation order rather than on anything the schema states.

Dropping the constraints removes the question. Recreating them at the end of
the transaction revalidates the entire reference graph, so a missed column
fails the migration instead of leaving a dangling row.

## How columns are found

Nothing is hardcoded except `MAPPED_TABLES` in `lib/catalog.ts`, which lists
the tables whose primary key is a generated entity id. Everything else comes
from the live catalog:

- **Id columns** come from walking the foreign-key graph to a fixpoint. One hop
  is not enough: `ModelVersionTag.modelId` holds a Model id but references
  `ModelVersion(modelId, versionNumber)`, and only `ModelVersion.modelId`
  points at `Model.id`.
- **Soft references** are every remaining text and JSON column, rewritten by
  value rather than by column name. That covers `Event.resourceId`,
  `Event.payload`, `ModelDraft.data`, `ModelInteraction.sessionId`,
  `User.image`, and the `fileKey` columns, without a list to keep in sync.

A table with a lone text `id` primary key that is missing from `MAPPED_TABLES`
aborts the run rather than being skipped in silence.

## What is deliberately left alone

- **`storagePathHash` segments.** Frozen in UUID shape so the incremental
  legacy sync keeps deriving the same object key. Replacement is by membership
  in the map, never by shape, so these are untouched.
- **`_prisma_migrations.id`.** Prisma's, not ours.
- **Values that merely look like ids.** `Session.token` and a filename such as
  `wolf-sheep-predation.nlogo` are left exactly as they are.

## Why drafts are purged

`ModelDraft.data` is the least structured thing in the database. It holds
storage keys, a `seededFrom` snapshot, and attachment ids that `newId()`
generates inside the blob itself. Nothing references those attachment ids, so
the map cannot reach them, and route params validate them against
`format: nanoid`, which means a legacy one makes
`DELETE /v1/model-drafts/:id/files/:fileId` reject with 400 for good.

Migrating that blob is the one part of this that could not be verified by
recreating a constraint. Publishing already hard-deletes the draft it came
from, so an abandoned draft is unfinished work rather than a record of
anything, and dropping them removes the whole question. Nothing has a foreign
key to `ModelDraft`, so the delete is unconditional.

`Event.payload.draftId` keeps its old value on already-published models. That
is the status quo, not a regression: publish deletes the draft and leaves the
audit payload pointing at a row that is already gone.

## Reruns

Safe. Stored map rows are reused, and a row that already carries its new id no
longer matches `old_id`, so its update is a no-op. A run interrupted between
the swap and the delete is finished by running it again.

## Afterwards

`_id_migration_map` stays behind as the audit trail and the only route back to
an old id. `prisma migrate dev` reports it as drift; `prisma migrate deploy`
does not. Drop it with `--drop-map` once the migration is settled.
