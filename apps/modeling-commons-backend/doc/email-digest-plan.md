# Email Digest

Status: approved 2026-10-27. Revised after `.work/reports/digest-plan-review.md`.

Where they conflict, the Decisions, Flow and Edge cases below are superseded by `doc/email-digest-followup-plan.md`.

Scope: let each notification category send email immediately, once a day as a digest, or not at all. Supersedes `.ongoing/daily-digest/` and `.ongoing/durable-notifications/daily-digest-15.md`; neither is built on.

## Decisions

- **Per-category email mode.** `UserNotificationPreference.email` becomes `'immediate' | 'daily' | 'off'`. `inApp` stays a boolean.
- **Mapped in place.** The frontend never calls the preference endpoints (`preferences.vue` is a hard-coded mock), so rows exist only from direct API use. The migration still maps them with `USING CASE WHEN email THEN 'immediate' ELSE 'off' END`, so no stored opt-out flips.
- **`general.daily_digest` goes away.** "Daily" is now a mode, not a category.
- **Eligibility is decided at insert.** `deliver()` writes `UserNotification.emailMode` as the category's mode at that moment (`immediate` or `daily`), or null when email is off. Only rows with a non-null `emailMode` are ever emailed, so a row written while opted out is never emailed later, whatever the user switches to.
- **Immediate stays in `deliver()`.** Only daily rows, and immediate rows whose send failed, reach the digest.
- **The ledger is the digest record.** `emailSentAt IS NULL` means unsent. No `DigestRun` table.
- **Leased, fenced claims.** `emailClaimedAt` marks a row as being sent. `markSent` and `releaseClaim` only touch rows whose `emailClaimedAt` still equals the value this caller wrote. A claim older than `claimLeaseMs` can be taken again.
- **Send time is bounded below the lease.** SMTP transport timeouts come from config, and a spec fails if their worst case is not shorter than the lease.
- **One digest function.** `sendDigest(recipientId, rows)` serves both the daily worker and the daily-to-immediate switch. Building the email from rows is a pure domain function.
- **Window: 25 hours, minimum age 5 minutes.** The digest covers unsent, emailable rows created between 25 hours and 5 minutes ago. The extra hour absorbs run-to-run drift. The minimum age keeps the digest off rows that `deliver()` or event retries are still working on.
- **17:00 UTC, retried the same day.** Any recipient failure fails the job at the end, and pg-boss retries it the same day. Recipients already sent are marked, so a retry only reaches the failures.
- **Flush is detached.** A switch to immediate fires the flush without awaiting it, per `mail.service.ts:17`. A failed flush falls through to the next digest if still in window.
- **No feed grouping.** Deferred.

## Conventions

These apply to every PR and come from earlier review of this module.

- **Decisions live in the domain.** Predicates and pure mappings go in `user-notification.domain.ts` (as `isDeliverableRecipient`, `isSuppressed`, `createLedgerRow`, `isRead` already do). The service only sequences I/O.
- **No try/catch.** Log-and-continue uses `.catch(...)`, as in `markEmailSent` and `resolve-notification-subjects.query.ts`. Fan-out uses `Promise.allSettled` and throws one `AggregateError`, as `handleEvent` does. Detached work is `void promise.catch(log)`.
- **Tests pin invariants, not implementation.** Assert outcomes that must never break: a row is emailed at most once; an opted-out row is never emailed; a failure leaves the row sendable. Do not assert call order or internal call arguments. Every new test is checked to fail by breaking the code it guards.
- **Mocks match real signatures.** An async repository method's mock resolves a value (`mockResolvedValue`), or `.catch` chains break.
- **Naming.** Functions start with a verb (`is`, `find`, `create`, `build`, `send`, `claim`, `mark`, `release`, `list`, `get`). No new `to...` names. Existing mappers (`toResponse`, used in 28 files) stay as they are.
- **Settings in `src/config/`, grouped by consumer.** Unit constants (`MINUTE_MS`, `HOUR_MS`, `DAY_MS`) in `src/shared/utils/consts.ts`. Settings shared by the digest worker and the flush live in `src/config/notifications.ts`, not `workers.ts`.
- **No code comments,** except a non-obvious reason that code cannot express. No em or en dashes anywhere.
- **Dependencies:** none expected. If one is needed, pin it exactly and keep `yarn install --frozen-lockfile` green; never let `yarn add` re-resolve other workspaces.

## Flow

```
event -> deliver(intent)
  resolve mode for the category
  insert row with emailMode = mode when 'immediate' or 'daily', else null
  'immediate': claim -> send -> markSent | releaseClaim on failure, rethrow
  'daily' or null: stop

digest worker (17:00 UTC, same-day retries)
  for each recipient with rows where emailMode IS NOT NULL, emailSentAt IS NULL,
      createdAt in [now - 25h, now - 5m]   (keyset by recipientId)
    sendDigest(recipient, rows); collect failures
  throw if any failed

updatePreferences: category 'daily' -> 'immediate'
  after commit, detached: sendDigest(recipient, pending rows of the switched categories)

sendDigest(recipient, rows)
  recipient not deliverable -> return (rows stay unsent and age out)
  claim:   UPDATE ... SET emailClaimedAt = now()
           WHERE id IN (rows) AND emailSentAt IS NULL
             AND (emailClaimedAt IS NULL OR emailClaimedAt < now() - claimLeaseMs)
           RETURNING id, emailClaimedAt
  none claimed -> return
  build:   pure, claimed rows -> summary email (capped at maxDigestItems, overflow released)
  send:    bounded by transport timeouts < claimLeaseMs
  success: markSent(ids, claimedAt)     fenced on emailClaimedAt = claimedAt
  failure: releaseClaim(ids, claimedAt) fenced, rethrow
```

## Why a leased, fenced claim

The conditional `UPDATE` hands each row to exactly one caller, so overlapping runs, a run racing a preference switch, or a run racing an event retry cannot email the same row.

- **Send failure:** `releaseClaim` clears the claim at once. For an immediate row the event retry claims it again on the next attempt. For a digest row, the same-day job retry does.
- **Crash between claim and send:** the claim expires after `claimLeaseMs`, and the same-day retry or the next run takes the row.
- **Send outliving its lease:** prevented by bounding the send (`connectionTimeout + greetingTimeout + socketTimeout < claimLeaseMs`, enforced by a spec), and made harmless by fencing: a late `markSent` or `releaseClaim` cannot touch a row someone else has claimed since. `socketTimeout` measures inactivity, so the lease sits far above the sum (15 minutes against 80 seconds).
- **Crash between send and `markSent`:** the email went out, and the lease later expires, so the row can be sent again. This is the same trade the immediate path already makes, and accepted.

## Edge cases

- **Opted out, then opted in:** rows written while off have `emailMode` null and are never emailed.
- **Daily to off:** pending rows keep `emailMode = 'daily'`. The digest still checks the current mode for the category and skips `'off'`, so they are not sent.
- **Recipient banned, deleted, or without email:** `sendDigest` returns without claiming, and the rows age out of the window.
- **Concurrent preference PATCHes:** the previous mode is read inside the update transaction, so a switch is seen exactly once. A double flush would be harmless anyway, because of the claim.
- **Digest down for over 25 hours:** older rows are never emailed and stay in the feed. Intended.

## PRs

`.ongoing/email-digest/`

1. `email-mode-1.md`: preference mode, the `emailMode` snapshot on rows, `general.daily_digest` removal, `deliver()` respects the mode.
2. `mail-timeouts-2.md`: SMTP timeouts and the lease in config, with the spec enforcing the bound.
3. `delivery-claim-3.md`: `emailClaimedAt`, fenced claim methods, `deliver()` claims and releases.
4. `digest-send-4.md`: summary email, `buildDigest`, `sendDigest`, detached flush.
5. `digest-worker-5.md`: the scheduled worker with same-day retries.

PRs 1 to 5 ship as one release. No UI exposes `daily` until the settings page is built, so an intermediate state on `main` is not reachable by users.
