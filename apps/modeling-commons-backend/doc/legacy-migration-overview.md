# Legacy Migration — Overview

Migrating six controller features from the legacy Rails app at `/Users/pas6148/Documents/netlogo/modelingcommons` into this Fastify+TypeScript backend. Greenfield treatment: original behavior is reference, not contract. Pre-beta repo — schema changes and refactors are fair game.

Source file: `NEEDS_MIGRATION.md` (at the backend root).

## Feature index

| # | Legacy controller | Modern shape | Plan |
|---|---|---|---|
| 1 | `GraphController` (graphviz PNG of fork tree) | JSON fork-graph endpoint; frontend renders | [[legacy-migration-fork-graph-plan]] |
| 2 | `CollaborationsController` (add/remove collaborators) | Reuse existing `model-author` module + add email notification on add | [[legacy-migration-collaborations-plan]] |
| 3 | `DiscussionController` (postings, Q&A flags, soft-delete) | New `model-comment` module: threaded, markdown, tombstone soft-delete, no Q&A | [[legacy-migration-discussion-plan]] |
| 4 | `HistoryController` (`revert_model` + `compare_versions`) | New patch + query in existing `model-version` module: revert copies a finalized version forward; compare diffs sections server-side | [[legacy-migration-version-history-plan]] |
| 5 | `PossibleSpamController` (model-only spam flagging) | New generic `report` module: polymorphic across `model | user | comment`, four-state lifecycle, admin-only resolution | [[legacy-migration-reporting-plan]] |
| 6 | `SearchController` (4-way FTS over models/authors/tags/version contents) | High-level spec only — implementation deferred | [[legacy-migration-search-spec]] |

## Cross-cutting decisions

- **Module skeleton:** every new module follows the canonical layout under `src/modules/<name>/` (domain, database with `.port`/`.mock`, dtos, queries, patches, `.service`, `.route`, `.mapper`, `index`). Mirrors `src/modules/model-author/`.
- **Writes:** all mutations go through `transactionManager.run`. Domain audit events written to the existing `Event` table in the same transaction with dotted event types (e.g. `model_comment.created`, `report.submitted`). No new audit infrastructure.
- **Soft-delete:** `deletedAt` columns; never hard-delete. Tombstone projection where the tree/order structure must survive.
- **Auth:** `requireAuth` for write paths; `resolveModel('read'|'write'|'admin')` for model-scoped access; `requireRole('admin')` for admin routes. No new hooks.
- **Email:** uses existing `mailService.sendMail` + `mailDomain.create*Email` factories backed by `@repo/emails` React templates. For MVP, new notifications use the generic `createNotificationEmail` template. Dedicated templates (e.g. `createNewCommentEmail`, `createAddedAsContributorEmail`, `createReportSubmittedEmail`) are deferred polish. Email sends fire post-commit with `Promise.allSettled` — failures log, do not throw, do not roll back the write.
- **Notifications scoped in:** new comment → notify model owner + contributors (not the commenter); contributor added → notify the new contributor; report submitted → notify the admin alert email.
- **Notifications out of scope:** in-app inbox, push, digest/summary, mentions, preferences/opt-out — all deferred to a future notifications-system plan.
- **No backwards-compatibility shims.** Legacy data is not migrated; legacy URL shapes are not preserved.
- **No frontend in these plans.** API contracts only.

## Decisions explicitly NOT taken in legacy fidelity

| Legacy behavior | Why dropped |
|---|---|
| Graphviz shell-out + `/tmp` PNG | New system dependency for one image; JSON + client rendering is the modern standard. |
| `NonMemberCollaboration` (invite-by-email outsiders) | Pending-invite state machine is a feature, not a migration. Account required to be added. |
| Posting `is_question` + `answered_at` | Q&A on comments is its own product surface; out of scope for a generic comment thread. |
| Posting body `gsub!('<', '&lt;')` | Naive escape; replaced by markdown stored as-is + frontend-side sanitized rendering. |
| `CollaboratorType` (custom roles like "Author") | `owner | contributor` is sufficient; granular per-user grants already live in `model-permission`. |
| Pre-XML section-separated `.nlogo` format (`@#$#@#$#@`) in compare | Helio standardizes on `.nlogox` (XML). |
| Search post-filtering visibility in app code | SQL-level visibility predicate (breaks pagination otherwise). |

## Sequencing

The plans were authored to be implementable in this order, with the noted gating:

1. **`model-comment`** (discussion) — no upstream gating.
2. **`report`** (reporting) — ship with `model` + `user` resource types only; add the `comment` case once `model-comment` lands (one-line enum migration).
3. **Version revert + compare** — independent; touches existing `model-version` module.
4. **Fork graph** — independent; lives under `model` module.
5. **Collaborations delta** — drop-in change to existing `model-author.service.ts`; independent.
6. **Search FTS** — deferred. The spec captures intent; a follow-up plan picks a storage strategy first.

## Tests

Each plan calls out its own unit + integration tests. House conventions from CLAUDE.md:
- Unit tests for domain logic and services (use the `.repository.mock.ts` siblings).
- Integration tests under `tests/integration/` cover the full route → service → DB path.
- Bugs get captured as a test first, then fixed.

## Open questions tracked across plans

Each per-feature plan has its own Open Questions section. The most cross-cutting ones:
- **Admin notification recipient** — single env var (`PRODUCT_ADMIN_ALERT_EMAIL`) vs iterate `User where role='admin'`. Reporting plan recommends single var; revisit if multiple admins want personal copies.
- **Dedicated email templates** vs generic `createNotificationEmail` for MVP. Each plan flags its eventual dedicated template as a polish item.
- **Post-commit hook abstraction** — multiple plans wire fire-and-forget email after `transactionManager.run`. A shared helper (`afterCommit(ctx, fn)`) is worth extracting once two of these land.
- **Mentions in comments / reports / commit messages** — universally deferred.
