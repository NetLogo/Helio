# Reporting & Moderation UI Plan

Companion to backend `legacy-migration-reporting-plan.md`. Two surfaces: the **user-side report button** (on models, users, comments) and the **admin moderation queue**.

## Backend surface

- `POST /v1/reports` — auth required. Body `{ resourceType: 'model' | 'user' | 'comment', resourceId, kind: 'spam' | 'abuse' | 'copyright' | 'other', reason }`. 409 on duplicate (same reporter + same resource).
- `GET /v1/admin/reports` — admin only. Filter by status / resourceType / kind / date range. Paginated.
- `GET /v1/admin/reports/:id` — admin only.
- `PATCH /v1/admin/reports/:id` — admin only. Body `{ status, resolverNote? }`. Status lifecycle is `open → reviewed | dismissed | resolved`, with reopen allowed from `dismissed → open` but not from `resolved`.

Identity leak note: every endpoint that returns the report DTO is admin-only. Reporter id is never exposed to the reported user.

## User-side: report button

### Where it appears

- **On model detail** (`ModelHeader.vue` or the bottom bar — already has a Share-style row): a `Report` action in an overflow menu, gated on `useUser()` returning a session. Anonymous users see the action but it routes to `/login?back=…` on click.
- **On user profile** (`UserHeader.vue`): same overflow placement.
- **On a comment** (`DiscussionNode.vue` action row): inline `Report` icon button.

Always behind an "overflow" menu rather than a primary button — reporting is a low-frequency action and a primary affordance encourages noise.

### Component

`ReportDialog.vue` (under `components/reporting/`):

- `UModal` opened with `{ resourceType, resourceId, resourceLabel }` (label is the model title / user name / first 60 chars of the comment, used only for the dialog header).
- Body: a `URadioGroup` for `kind` (Spam / Abuse / Copyright / Other), a `UTextarea` for `reason` (required, 2000 char max, counter shown), `Cancel` and `Submit report` buttons.
- Submit: `POST /v1/reports`. On 409, swap the body to a "You've already reported this" inline state with a single dismiss action — don't trap the user in a dialog they can't escape.
- On success: close, toast `Report submitted. Our moderation team will review it.`
- On error: inline error above the buttons; keep the dialog open.

A single component for all three resource types — the resource-specific copy is just the dialog title.

### Composable

`useSubmitReport()`:

- One function `submit({ resourceType, resourceId, kind, reason })`.
- Returns `{ submit, submitting }`.
- Maps backend errors via `handleApiError`. 409 surfaces as a distinguishable code so the dialog can render the "already reported" branch.

No optimistic updates — reporting is a low-frequency action and waiting on the server is fine.

## Admin side: moderation queue

### Where it lives

A new admin section gated on `useUser().data.systemRole === 'admin'`:

- `pages/admin/reports/index.vue` — queue.
- `pages/admin/reports/[id].vue` — detail + resolution.

A `requireAdmin` middleware (`middleware/admin.ts`) redirects non-admins to `/`. The navbar surfaces an "Admin" link only when the role is admin — easy to add to `ClientNavbar.vue`.

### Queue page

Layout: filter bar across the top, paginated table below.

Filters (URL-synced via the existing `useModels`-style pattern):

- Status: `Open` (default), `Reviewed`, `Dismissed`, `Resolved`, `All`.
- Resource type: `Model`, `User`, `Comment`, `All`.
- Kind: `Spam`, `Abuse`, `Copyright`, `Other`, `All`.
- Date range: `Last 7d`, `Last 30d`, `All time`, `Custom`.

Table columns: `Reported` (resource title + type icon, linked to the resource), `Kind`, `Reporter`, `Created`, `Status` badge, action `Open →`.

Reuse:
- `UStripedTable` wrapper.
- `useApiPagination()`.
- The URL-synced filter pattern from `useModels` (composable: `useReportsQueue()`).

Empty state: `Empty.vue` shared component with a context-aware message ("No open reports — nice").

### Detail page

`pages/admin/reports/[id].vue`:

- Header: `Report #abc…` with kind + status badges and the resource link.
- **Resource preview** panel — shows the actual reported content:
  - Model: `ModelCard` (existing component).
  - User: `UserHeader`.
  - Comment: a read-only `DiscussionNode` plus a link to its model and thread anchor.
- **Report details** panel: reporter (avatar, name, link), kind, reason (rendered with `whitespace-pre-wrap`, not markdown), createdAt.
- **History** panel: list of `report.status_changed` events (from the existing `Event` audit log, exposed via an `/admin/events?resourceType=model&resourceId=X` lookup if available, otherwise embedded in the report response — push to backend if needed). Each row: status transition, admin, note, when.
- **Resolution form**: status `URadioGroup` (transitions allowed surfaced by the backend's `assertValidTransition` map), `resolverNote` textarea (optional, 2000 max), `Save` button.

Backend's "an admin cannot resolve their own report" is surfaced by graying the form and showing an inline notice "You filed this report — another moderator must resolve it.".

### Composables

- `useReportsQueue()` — paginated, URL-synced list. Same shape as `useModels`.
- `useReport(id)` — single fetch.
- `useUpdateReportStatus(id)` — mutation. Refetches on success.

## Admin role detection

The session shape (Better Auth + admin plugin) already exposes `systemRole`. Surface it from `useUser()` if not already. The `Admin` navbar link and the admin pages all gate on `systemRole === 'admin'`. Don't trust this for any data — the backend hooks (`requireRole('admin')`) are the actual gate.

## UX details

- **No "report list for the reporter":** backend flagged `GET /v1/reports/mine` as a follow-up. Not in MVP scope. If we ever add it, surface in `profile/` as a "My reports" section.
- **No notify-on-resolution to the reporter** — backend doesn't, UI doesn't promise it.
- **No notify-the-reported-user** — backend's "secret reports" stance is correct; UI should never leak that a report was filed.
- **Rate limit feedback:** the backend plan notes a per-user rate limit on submission (e.g. 20/hour). When that 429s, the dialog shows a friendly "You've submitted a lot of reports recently — try again in a bit." rather than a generic error.

## Edge cases

- **Comment reports while `model-comment` is still in flight on backend:** the backend plan notes the `comment` enum value may not exist yet. Detect a 400 on `resourceType: 'comment'` and hide the comment-row report action until the enum lands. Simple feature flag in env config (`features.commentReports`).
- **Reported resource was deleted between submission and resolution:** the queue still surfaces the report (backend keeps the row); the resource preview shows a `Resource no longer available` placeholder.
- **Admin filters by a date range that returns no results:** show the empty state with a "Clear filters" affordance.

## Out of scope

- Bulk admin actions (mark 50 dismissed). Backend flagged as not-MVP.
- Reporter reputation / weighting. Every reporter is equal.
- Auto-classification. All moderation is human.
- In-app inbox for admins (the admin email is the notification mechanism — see backend plan).
- "Take action on the resource" buttons from inside the report (delete the model, ban the user). Those are separate admin tooling not covered here — link out to the resource and let admins use whatever delete/ban affordances exist on the resource pages.

## Open questions

- **Where the admin link lives in navbar:** a dedicated `Admin` top-level vs. inside the user menu. Recommend the user menu (lower visual weight); revisit if admin tooling grows.
- **Report a self-authored resource:** backend flagged `CannotReportOwnContentError` as a defensive check (open question). UI can preempt by hiding the action when caller owns / authored the resource — friendlier than letting the request 403.
- **Resolution note required for `resolved` / `dismissed`?** Backend allows null. UI can require non-empty as a soft validation; defer until moderators tell us they want it enforced.

## Reuse checklist

- `useApiPagination()`.
- The `useModels` URL-synced filter pattern as the model for `useReportsQueue`.
- `UStripedTable`, `UBadge`, `UModal`, `URadioGroup`, `UTextarea`.
- `ModelCard`, `UserHeader`, `DiscussionNode` for resource previews.
- `useToast()` and `handleApiError`.
