# Email Digest Follow-up

Status: approved 2026-10-27.

Scope: simplify the shipped digest (commits `5d737f6a..eb0124dc`) so rows are plain facts and the preference switch owns its own side effects, merge notifications per model into one line, and clean up rows that no longer point at anything. The conventions in `doc/email-digest-plan.md` still apply.

## Decisions

- **Rows are plain facts.** `UserNotification.emailMode` is dropped. `deliver()` writes the row without deciding whether it may be emailed later.
- **The switch hosts the side effect.** When a category's email mode changes to `immediate` or `daily`, the switch sends one digest of that category's unsent rows from the last 25 hours (no minimum age), then the new mode applies. Switching to `off` sends nothing. No extra metadata is stored. Rows written while the category was `off` are included; that is intended ("what you missed today").
- **The worker sends `daily` categories only.** Rows unsent, inside the window, in a category currently `daily`. A failed immediate email is not picked up by the digest; it had its event retries.
- **One window, both callers.** The switch and the worker both use the 25 hour limit. The worker also keeps its 5 minute minimum age; the switch does not.
- **Merging is pure and central.** `groupNotifications(rows)` in the user-notification domain groups by target only, so replies and comments on one model merge into one line. Nothing about the grouping knows email exists. The deferred feed grouping reuses it.
- **Public strings are built outside the service.** Notification phrasing lives in the user-notification domain. The generic name list ("Alice, Bob, and 11 others") lives in `src/shared/utils/formatters.ts`, next to `truncatePreview`, because nothing about it is notification specific.
- **Unresolvable names truncate early.** An actor whose account is gone is not named but still counted. A group whose target no longer resolves is left out of the email; its rows are marked sent with the rest. The janitor removes them later.
- **Every claimed row is marked sent.** The 50 cap applies to lines. Beyond it the email ends with "and N more", linking to the feed. `splitDigestOverflow` goes away, so overflow is never released into a window it can no longer reach.
- **A notification janitor.** A weekly worker deletes rows whose target model is gone and rows older than the retention period.

## Name list

`formatNameList(names, total)` where `names` are the resolvable names, newest first, at most two used, and `total` is the count of distinct actors:

| names | total | text |
|---|---|---|
| none | 1 | One person |
| none | 4 | 4 people |
| Alice | 1 | Alice |
| Alice | 2 | Alice and 1 other |
| Alice | 4 | Alice and 3 others |
| Alice, Bob | 2 | Alice and Bob |
| Alice, Bob | 3 | Alice, Bob, and 1 other |
| Alice, Bob | 13 | Alice, Bob, and 11 others |

`describeGroup(group, subjects)` returns `{ text, url }`, for example `Alice, Bob, and 11 others commented on Wolf Sheep`, with the phrase taken from a map keyed by target type (`model: 'commented on'`).

## Flow

```
updatePreferences: email mode changes to 'immediate' or 'daily'
  after commit, detached:
    rows = unsent rows of the switched categories, created in the last 25 hours
    sendDigest(recipient, rows)

digest worker (17:00 UTC)
  rows = unsent rows in categories currently 'daily', created in [now - 25h, now - 5m]
  sendDigest(recipient, rows) per recipient

sendDigest(recipient, rows)
  claim -> resolve subjects (names, urls) -> groupNotifications -> describeGroup
        -> buildDigest (lines, cap, "and N more") -> send -> markSent(all claimed)
```

## PRs

`.ongoing/email-digest/`

1. `plain-rows-6.md`: drop `emailMode`, switch-to-any-non-off flush with the 25 hour limit, worker sends `daily` only.
2. `subject-names-7.md`: `NotificationSubject.name` from the existing batched lookup.
3. `notification-groups-8.md`: `formatNameList`, `groupNotifications`, `describeGroup`, the digest builds lines from them, every claimed row marked sent.
4. `notification-janitor-9.md`: weekly cleanup of orphaned and expired rows.

Numbering continues from the shipped slices. PRs 1 to 3 are serial; 4 depends only on 1.
