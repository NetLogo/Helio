# Collaborations UI Plan

Companion to backend `legacy-migration-collaborations-plan.md`. The backend delta is small (just add a contributor-added email), but the UI for managing contributors on a model isn't built yet. This plan covers it.

## Scope

User-facing surface for the existing `model-author` endpoints:

- `POST /v1/models/:id/authors` — add contributor
- `DELETE /v1/models/:id/authors/:userId` — remove contributor
- `POST /v1/models/:id/authors/transfer` — transfer ownership

Plus surfacing the contributor list as a first-class UI element.

## Where it lives

Add a **Contributors** management surface on the model detail page. Two reasonable placements; pick one:

1. **New tab** on `ModelDetail` alongside Discussion / Files / Versions / Family. Cleanest, matches existing pattern.
2. **Inline panel** on a model-settings page (`/models/:id/settings`) gated by `resolveModel('write')`. Better if we anticipate other write-side settings (license edit, visibility flip, archive).

**Recommendation:** start with a tab. Migrate to a settings page once a second write-only surface (license edit, etc.) needs the same gating.

Read-only display of authors is already handled by `components/model/ModelAuthors.vue` and surfaces in the model header. That stays; this plan adds the management UI.

## Components

All new components live under `components/model-detail/contributors/`:

- `ModelContributorsTab.vue` — top-level tab body. Renders the list, the add control, and a "Danger zone" subsection for transfer/leave actions. Hidden entirely if the current user has neither write nor admin on the model.
- `ContributorRow.vue` — single row: avatar, name, role badge (`Owner` / `Contributor`), a kebab menu with `Remove` (and `Transfer ownership →` for contributors when the caller is the owner). Reuses `UserAvatar`.
- `AddContributorControl.vue` — single-line affordance wrapping `UserSelectMenu` (already exists, used for peer-review co-authors) with a confirm button. Server-side username/email search, debounced.
- `TransferOwnershipDialog.vue` — `UModal` confirm. Lists the implication ("you become a contributor"), requires typing the model title to confirm. Disabled until the new owner exists in the contributor list.

The kebab menu and dialog confirmation use Nuxt UI primitives directly; no new shared abstraction.

## Composable

Single new composable `useModelContributors(modelId)` exposing:

- A reactive contributors list (server fetch, keyed by `model-contributors-${modelId}`).
- `add(userId)`, `remove(userId)`, `transfer(toUserId)` mutations.
- A `busy` ref so the row in flight is dimmed and the button disabled — same pattern as `useModelInteractions`.

Mutations are NOT optimistic. The contributor list is short and the latency cost of a refetch is invisible; mid-flight optimism complicates the role badge ("are they a contributor yet or not") more than it helps.

## UX details

- **Add:** the `UserSelectMenu` query hits the existing user search (already used by `PeerReviewCard`). Users with no account are not findable — surface an inline hint ("Can't find them? They need to sign up first.") when zero results return for a query that looks like an email. This is the user-visible consequence of dropping legacy `NonMemberCollaboration`.
- **Remove a contributor:** soft confirm via `useToast({ actions: [{ label: 'Undo', click: () => add(userId) }] })`. The action button on the toast re-adds within a 5s window. Optimistic-feeling without a real undo log on the backend.
- **Remove self:** allowed for contributors, never for the owner. Renders as "Leave model" with stronger confirmation copy. Navigates the caller back to `/models` on success.
- **Transfer ownership:** two-step confirmation. The new owner must already be a contributor (matches backend `assertNotOwner` semantics; transferring to a non-contributor would need a two-step backend flow we don't have).
- **Contributor-added toast on the *adder's* side:** "Invited Alex Smith — they'll receive an email." Use the toast description to make the email side-effect visible (backend now sends one).

## Edge cases

- Caller loses write permission mid-session (e.g., owner just transferred to them and then removed them): the next mutation 403s; surface the error toast and refetch the list. Don't try to detect it preemptively.
- Last-contributor invariant: the owner can't be removed; `Leave model` is hidden when the caller is the only listed user. Defense against accidental empty-model state; backend enforces.
- Race on transfer + remove: backend handles via `transactionManager.run`; UI just trusts the response.

## Where to surface the email side-effect

The added contributor receives an email per backend plan. Two places to reflect this in the UI:

1. On the **adder's** toast (above) — "they'll receive an email."
2. On the **added user's** in-app banner the next time they visit `/models` — a one-time dismissable `UAlert` "You were added to N model(s)." Backend doesn't have an inbox so we'd need a derived signal (e.g., `useForumModels({ contributorAddedSince: lastSeen })`). Defer this to the future notifications-system work the backend overview already flags.

## Out of scope

- In-app notifications inbox (deferred globally per backend overview).
- Email-on-ownership-transfer — backend doesn't send one (flagged as open question); UI should not promise it.
- Bulk add (no backend, no UX demand yet).
- Permission grants (`ModelPermission`) — separate concern from authorship; not touched here.

## Open questions

- **Tab vs settings page placement** — see [Where it lives](#where-it-lives). Defer until a second write-only surface lands.
- **Show the added user's name immediately after add?** The POST returns just an id; we'd need to refetch the list to populate the row. Acceptable to refetch; alternative is to include the user in the response — push to backend if the latency feels bad in practice.
- **Inviter visibility to the new contributor** — backend plan flags a polish follow-up (`createAddedAsContributorEmail` with inviter name). If/when that lands, no UI changes needed — the email is the surface.

## Reuse checklist

- `components/user/UserSelectMenu.vue` — for the add input.
- `components/user/UserAvatar.vue` — in `ContributorRow`.
- `components/model/ModelAuthors.vue` — read-only display; do not duplicate.
- `useToast()` — confirms with undo.
- Error handling via `handleApiError` from `utils/errors.ts`.
