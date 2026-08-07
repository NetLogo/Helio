# Legacy Migration — Incremental Patch

`prisma/archive.ts` was a one-shot import. It is idempotent only in the sense that
re-running it skips anything already carrying a `legacyId`; it cannot see edits,
deletions, or new children of an already-migrated node. The legacy app kept
running after the migration, so the live target now lags behind it.

`prisma/patch.ts` closes that gap from a diff of the legacy database.

## Running it

```bash
# 1. produce the diff (needs both schemas in one database: `public` = the
#    snapshot that was migrated, `incoming` = a fresh dump)
LEGACY_DB=nlcommons_current DIFF_DIR=~/dbdiff ./prisma/diffdb.sh

# 2. dry run — plans everything, writes nothing
DATABASE_URL=… LEGACY_DATABASE_URL=… yarn run db:patch

# 3. apply — stages files, uploads, writes in one transaction, then verifies
DATABASE_URL=… LEGACY_DATABASE_URL=… yarn run db:patch --apply

# re-check a patch applied earlier
yarn run db:patch --verify-only
```

| Variable               | Default                 | Meaning                                       |
| ---------------------- | ----------------------- | --------------------------------------------- |
| `DATABASE_URL`         | —                       | Target (new schema) database                  |
| `LEGACY_DATABASE_URL`  | —                       | Database holding the legacy `incoming` schema |
| `LEGACY_SCHEMA`        | `incoming`              | Schema with the fresh legacy dump             |
| `DIFF_DIR`             | `~/dbdiff`              | Where `diffdb.sh` wrote its CSVs              |
| `OUTPUT_DIR`           | `./prisma/patch-output` | Staged files + `patch-manifest.json`          |
| `PATCH_TXN_TIMEOUT_MS` | `300000`                | Transaction budget                            |

Flags: `--apply`, `--verify-only`, `--skip-upload`.

## How it works

1. **Plan.** Reads `side` and `id` from each diff CSV and re-reads the authoritative
   row from the legacy `incoming` schema — `diffdb.sh` replaces the `contents`
   columns with an md5 digest, so the CSV alone cannot rebuild a file. Deleted rows
   are the exception: they are gone from the snapshot, so their `row_to_json` is
   the only surviving copy. The `col: [old] -> [new]` summary on modified rows is
   never parsed.
2. **Print.** The dry run and the real run compute the same plan, so what you read
   is what gets written.
3. **Stage + upload.** Objects go up before the transaction. An orphaned object is
   harmless; a row pointing at a missing object is not.
4. **Apply.** One transaction. Any failure rolls back everything.
5. **Verify.** Writes `patch-manifest.json` — a flat list of assertions — and replays
   it against the database and the bucket. `--verify-only` reruns it later.

Ordering matters and is fixed: tags → users → new models → appended versions →
attachments/previews → taggings → model updates → deletions. Children of a node
created in this run are written by the archive routine itself, so they are
suppressed from the individual passes rather than double-inserted.

## What it will not do

The script stops instead of guessing when:

- a version is deleted from a node that still exists — `versionNumber` is a
  positional counter referenced by `Model.latestVersionNumber`,
  `Model.parentVersionNumber`, `ModelVersionTag` and `ModelAdditionalFile`, so
  removing one mid-sequence needs a hand-written renumbering;
- new versions are not the chronologically newest, which would break the
  `created_at` ordering `versionNumber` encodes;
- a non-preview attachment was modified in place — `ModelAdditionalFile` carries no
  `legacyId`, so the matching row cannot be identified with confidence.

## Decisions

- **Keyed on `legacyId` only.** No `id` column of an existing row is read or written.
- **Soft delete.** A deleted legacy node sets `Model.deletedAt`; versions, tags and
  files are left intact, matching how the app hides models.
- **Previews are recomputed, not patched.** A preview is one column on the latest
  version and the _highest legacy attachment id_ wins it, so individual adds and
  removes cannot be applied to it. Any node whose preview-typed attachments changed
  has its preview recomputed from the whole attachment set. Preview object keys are
  derived from the legacy attachment id so re-running reuses the same object.
- **Tags and previews move onto an appended version, they do not copy.** `archive.ts`
  keeps a node's tags and preview on its latest version only, and the app reads them
  from there (`model.card.record.ts` takes `versions` ordered desc, `take: 1`).
  Copying would leave duplicates on the superseded version that a fresh archive would
  never produce.
- **`updatedAt` is not patched.** Prisma's `@updatedAt` overrides any value supplied
  on create, so `archive.ts` stamped every migrated row with the migration time and
  legacy `updated_at` was never preserved. Writing it now would leave a handful of
  rows inconsistent with the other ~4,700.
- **`ModelInteraction` is out of scope.** `archive.ts` migrated zero interactions, the
  table has no `legacyId` and no unique constraint (so `skipDuplicates` is a no-op),
  and `diffdb.sh` skips the source tables. Re-running that phase would duplicate
  every row.
- **Tables archive.ts never mapped are ignored and listed at startup**:
  `collaborations`, `groups`, `memberships`, `recommendations`, `spam_warnings`
  (read for exclusions, never written), `logged_actions`, `model_view*`.

## Known divergences from a from-scratch archive

- A soft-deleted model stays in the target; an archive of the new snapshot never
  sees it.
- A version's object key keeps the node name it was uploaded under. Renaming a node
  updates `ModelVersion.title` but does not move objects in storage, so the key's
  trailing filename can lag. Cosmetic; the key is opaque to the app.

## Verification

`prisma/rehearsal/run.sh` proves the property that matters:

> `archive(baseline) + patch(diff)` produces the same database as
> `archive(new snapshot)`.

It builds a legacy database with a `public` baseline and an `incoming` schema
carrying a changelog of sixteen scenarios (new/renamed/deleted nodes, an appended
version, added and removed attachments, a superseded preview, a colliding tag name,
a spam node, a versionless node, an email collision, a profile edit), archives the
baseline, diffs, patches, archives the new snapshot into a second database, and
diffs canonical uuid-free dumps of both.

```bash
yarn run svc          # postgres must be up
./prisma/rehearsal/run.sh
```

Applying twice is a no-op — the third run reports `(nothing to do)`.

## Bug found in `archive.ts`

`parseNlogox` called `new DOMParser()`, which does not exist in Node. Every
`.nlogox` / `.nlogox3d` model therefore hit the `catch` and stored
`netlogoVersion: null, infoTab: null`. It is now a dependency-free parser with unit
tests, so new models get real values. **Already-migrated `.nlogox` models still hold
nulls** and need a backfill if that matters.
