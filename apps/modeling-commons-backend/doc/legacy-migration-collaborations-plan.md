# Legacy Migration: Collaborations

Almost everything in legacy `CollaborationsController` is already covered by the existing `model-author` module. This doc records the mapping and the one real delta: send an email when a user is added as a contributor.

Related: [[legacy-migration-fork-graph-plan]], [[legacy-migration-search-spec]].

## Overview

Legacy `CollaborationsController` has two actions: `create` (add a collaborator to a node, optionally inviting a non-member by email) and `destroy` (remove yourself or another collaborator). It also depends on `CollaboratorType` (a polymorphic string-typed role like `"Author"`).

In the new backend, this maps onto `src/modules/model-author/`:

- `addContributor` (`POST /v1/models/:id/authors`)
- `remove` (`DELETE /v1/models/:id/authors/:userId`)
- `transferOwnership` (`POST /v1/models/:id/authors/transfer`)
- Roles are a two-value enum: `owner | contributor`.

No structural migration is needed. The deltas are: add a contributor-added email notification, document the operations that are deliberately dropped.

## Mapping

| Legacy | Existing endpoint | Notes |
|---|---|---|
| `POST collaborations#create` (member) | `POST /v1/models/:id/authors` (in `src/modules/model-author/model-author.route.ts`) | Already exists. Adds delta below. |
| `DELETE collaborations#destroy` | `DELETE /v1/models/:id/authors/:userId` | Already exists. No email. |
| `POST collaborations#create` (non-member by email) | — | **Dropped.** Recipient must already have an account. |
| `CollaboratorType` lookup | — | **Dropped.** Roles collapsed to `owner | contributor`. |
| Implicit "first collaborator becomes Author" | Domain rule on `createModel` (owner attached at model creation) | Already implemented. |

The legacy "cannot remove the last collaborator" rule maps to `modelAuthorDomain.assertNotOwner` — the owner can't be removed without an explicit ownership transfer first.

## Delta: email notification on add

`modelAuthorService.addContributor` currently inserts the row and emits the audit event inside `transactionManager.run`. After commit, fire-and-forget an email to the newly-added user.

Service-level change (pseudocode appended to the end of the existing `addContributor`):

```ts
async addContributor(modelId, userId, callerId) {
  // ... existing assertions + tx ...
  await transactionManager.run(async (ctx) => { ... });

  const [newAuthor, model] = await Promise.all([
    userRepository.findById(userId),
    modelRepository.findById(modelId),
  ]);
  if (newAuthor && model) {
    const email = await mailDomain.createNotificationEmail(
      newAuthor.email,
      newAuthor.name,
      `You've been added as a contributor on "${model.title}".`,
      env.product.unsubscribeUrl,
    );
    void mailService.sendMail(email).catch((err) =>
      logger.warn({ err, modelId, userId }, 'contributor-added email failed'),
    );
  }
}
```

Notes:

- Email fires **after** the commit. If the tx rolls back, no email.
- Fire-and-forget — wrap in `Promise.allSettled`-equivalent (`void ... .catch(...)`). A failed email must never roll back the add. The existing `mailService.sendMail` already swallows errors internally and logs them; we still defensively `.catch` because the helper returns a promise of the nodemailer callback wrapper.
- Dependencies to add to the service's awilix bindings in `src/modules/model-author/index.ts`: `mailService`, `mailDomain`, `userRepository`, `modelRepository`, `logger`.

## Where the email goes

For MVP, reuse `mailDomain.createNotificationEmail` (in `src/modules/mail/domain/mail.domain.ts`). It renders `packages/emails/src/templates/2-Notifications/NotificationEmail.tsx` with a free-form notification body.

Polish follow-up (not part of this delta): add a dedicated template `packages/emails/src/templates/2-Notifications/AddedAsContributorEmail.tsx` with explicit model name, model link, and inviter name. When that lands, add `createAddedAsContributorEmail(userEmail, userName, modelTitle, modelUrl, inviterName)` to `mailDomain` and switch the service to call it.

## Tests

Extend `src/modules/model-author/model-author.service.spec.ts`:

- New case: `addContributor sends email to new contributor on success`.
  - Mock `userRepository.findById` to return `{ email, name }`.
  - Mock `modelRepository.findById` to return `{ id, title }`.
  - Mock `mailService.sendMail` and `mailDomain.createNotificationEmail`.
  - Assert `mailService.sendMail` called exactly once with the rendered content.
- New case: `addContributor does not throw if email fails`.
  - Make `mailService.sendMail` reject.
  - Assert `addContributor` resolves; the audit event was still emitted.
- New case: `remove does not send any email`.
  - Assert `mailService.sendMail` is **not** called.
- Existing tests remain unchanged.

If `mailService` and friends aren't already in the existing spec's `as never` cast, extend the DI bag with mocked versions. Use `vi.fn()` returning resolved promises.

## Open questions

- **Opt-out / preferences.** Should users be able to suppress contributor-added emails? No user-prefs system today; skip for MVP, flag for later when notification prefs land.
- **Email the model owner who just added the contributor?** Legacy did not; the owner triggered the action and doesn't need to be told. Skip.
- **Email on ownership transfer?** Probably yes — the new owner ought to know. Not part of this delta; flag for a follow-up plan that touches `transferOwnership`. Note that legacy did not do this either.
- **Bulk add.** No legacy support, no current support. Out of scope.

## Out of scope

- `NonMemberCollaboration` (invite-by-email for users with no account). The new system requires an existing account; the inviter must look up the recipient by user ID.
- Custom collaborator role strings (`CollaboratorType`). Replaced by the two-value `model-author.role` enum.
- Frontend UI changes.
- Permission-grant emails. `ModelPermission` is a separate concern from authorship and is not touched here.
