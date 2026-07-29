# comment-notifier-5 — Move comment notifications onto the durable pipeline

**Goal** — Move comment notification wording into a notifier owned by `model-comment`, and
delete the inline fire-and-forget send.

## In scope

- `src/modules/model-comment/notifications/model-comment.notifier.ts` (new).
- `src/modules/model-comment/notifications/model-comment.notifier.spec.ts` (new).
- `src/modules/model-comment/index.ts` — declare `modelCommentNotifier`.
- `src/modules/user-notification/user-notification.service.ts` — add `modelCommentNotifier` to
  the notifiers array.
- `src/modules/model-comment/model-comment.service.ts` — delete the notification code.
- `src/modules/model-comment/model-comment.service.spec.ts` — drop the notification block.
- `tests/api/model-comment.feature` / `.steps.ts` and `tests/api/user-notification.feature` /
  `.steps.ts` — move the two notification scenarios.

## Out of scope

- Changing who gets notified, or the wording of either email. This is a move, not a redesign.
- Notifiers for `model_comment.updated` or `model_comment.deleted`. Both events are emitted;
  neither notifies anyone today and neither should start here.
- Comment likes. They send nothing and write no event row today; unchanged.

## Description

The notifier subscribes to `model_comment.created` and resolves the comment from
`event.payload.commentId` — the event row is now the only input, so it no longer receives the
entity from the caller.

Everything moves across with semantics unchanged:

- `truncatePreview` (`model-comment.service.ts:9-12`), now using
  `rules.limits.notification.previewLength`.
- `buildEmailModel` (`:55-76`), including its `getModelCardQuery` failure fallback to
  `{ name: 'a model', url }`.
- The thread deep link (`:81-89`): a reply's own URL opens detached, so the URL roots at
  `parent?.id ?? entity.id` and sets `highlightedCommentId` to the new comment.
- The recipient set (`:99-105`): the parent comment's author gets
  `createRepliedToCommentEmail` under `comment.reply_to_you` unless they are the commenter;
  every other `ModelAuthor`, minus the commenter and minus the parent author, gets
  `createCommentedOnModelEmail` under `comment.on_your_model`.

Two things change. The notifier returns `NotificationIntent[]` instead of calling `mailService`,
and `unsubscribeUrl` comes from the `links` argument instead of
`` `mailto:${env.product.supportEmail}` ``. Each intent's `buildEmail` closes over the already-
computed model card and preview, so the card query runs once per event rather than once per
recipient.

Then `model-comment.service.ts` loses `truncatePreview`, `buildEmailModel`,
`notifyOnNewComment`, and the `void notifyOnNewComment(entity, parent)` call at line 209, plus
the now-unused dependencies `modelAuthorRepository`, `userRepository`, `getModelCardQuery`,
`mailService`, `mailDomain` and the `env` / `EmailModel` imports. It becomes purely
transactional.

## Acceptance criteria

- Posting a comment on a model with an owner and a contributor, then draining the queue,
  produces exactly two emails; neither goes to the commenter.
- Commenting on your own model produces no email.
- Replying to someone else's comment sends them the reply template exactly once, and they do
  not also receive the commented-on-model template.
- The `commentUrl` on every intent contains `highlightedCommentId=<new comment id>` and roots
  at the parent's id for a reply, the comment's own id for a top-level comment.
- A `getModelCardQuery` failure still yields an email, with the model name `'a model'`.
- Recipients who opted out of the relevant category receive nothing, and no ledger row is
  written for them.
- `getModelCardQuery.execute` is called once per event, not once per recipient.
- `model-comment.service.ts` no longer references `mailService`, `mailDomain`, or `env`.
- `model-comment.service.spec.ts` retains only transactional assertions and no longer defines
  `flushMicrotasks`.
- `yarn run check`, `yarn run test:unit`, `yarn run test:e2e` pass.

## Depends on

`dispatch-4.md`

## Notes

The notifier spec should carry over the assertions currently in `model-comment.service.spec.ts`
rather than being written fresh — they encode behavior worth preserving exactly, including the
positional-argument assertion on `commentUrl`.

The two e2e scenarios at `tests/api/model-comment.feature:179` ("Commenting notifies other
authors but never the commenter") and `:193` ("Commenting on your own model does not notify
yourself") assert inline sending and will fail as written. Move them into
`user-notification.feature` and trigger the batch with `boss.send('process-events', {})`, as
`tests/api/workers.steps.ts:42-45` already does. The mail-capturing monkey-patch and
`waitForMailCalls` helper at `tests/api/model-comment.steps.ts:314-344` move with them.

Delivery is now up to ~60s slower (the cron interval). Expected and accepted.

Once this merges, `mailDomain.createCommentedOnModelEmail` and `createRepliedToCommentEmail`
have exactly one caller each — the notifier — which is the intended shape: the producing module
picks its own template.
