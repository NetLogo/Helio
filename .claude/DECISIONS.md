# Decisions

## Legacy migration — incremental patch (2026-08-07)

`prisma/archive.ts` was a one-shot import and cannot see edits, deletions or new
children of an already-migrated node. `prisma/patch.ts` applies those from a
`diffdb.sh` diff. Full rationale in
`apps/modeling-commons-backend/doc/legacy-migration-patch.md`.

- Reusable logic was extracted from `archive.ts` into `prisma/lib/` rather than
  duplicated, so the patch produces byte-identical keys and rows.
- The patch is keyed entirely on `legacyId`; no existing row's `id` is touched.
- Correctness criterion: `archive(baseline) + patch(diff)` must equal
  `archive(new snapshot)`. Enforced by `prisma/rehearsal/run.sh`.
- The script refuses to run — rather than guessing — on mid-sequence version
  deletes, out-of-order version appends, and in-place attachment edits, because
  `ModelVersion` and `ModelAdditionalFile` carry no legacy id.
- `updatedAt` is never patched: Prisma's `@updatedAt` overrode it on create, so
  no migrated row ever held the legacy value.
- `ModelInteraction` is out of scope: no legacy id, no unique constraint, and
  `archive.ts` migrated zero rows.
