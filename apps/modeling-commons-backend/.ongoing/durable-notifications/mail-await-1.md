# mail-await-1 — Await SMTP delivery in mailService

**Goal** — Make `mailService.sendMail` resolve only after nodemailer reports the delivery
outcome, so callers can observe failures.

This PR is done.

## In scope

- `src/modules/mail/mail.service.ts` — promisify the nodemailer callback.
- A new `src/modules/mail/mail.service.spec.ts` covering both outcomes.

## Out of scope

- Retry logic, queueing, or backoff. This PR only makes the outcome *knowable*.
- The three direct `transporter.sendMail` call sites in `src/lib/auth.ts` (lines 59-69, 85-90,
  98-103). They bypass DI and use `void … .catch(console.error)`; leave them alone.
- Changing any caller's behavior.

## Description

`sendMail` is declared `async` but wraps nodemailer's callback API without bridging it:

```ts
async sendMail(content: Mail.Options) {
  transporter.sendMail(content, (error, info) => {
    if (error) { logger.error({ name: 'Mail Service', message: 'Failed to send email', error, info }); }
    else { logger.info({ name: 'Mail Service', message: 'Email sent successfully', info }); }
  });
}
```

The returned promise resolves as soon as `transporter.sendMail` is *called*, not when it
completes. Every `await mailService.sendMail(...)` in the codebase is therefore a no-op wait,
and the delivery result is only ever visible in the logs.

Wrap the callback in a promise that resolves on success and rejects on error, keeping both log
lines exactly as they are so log output does not change.

This is a prerequisite for the durable pipeline: `dispatch-4` stamps `emailSentAt` on a ledger
row after `sendMail` resolves, which is meaningless while it resolves unconditionally.

## Acceptance criteria

- `await mailService.sendMail(...)` rejects when the transporter invokes its callback with an
  error, and resolves when it invokes it with `info`.
- Both existing log lines still fire, with unchanged `name` and `message` values.
- `mail.service.spec.ts` covers success and failure, stubbing the transporter.
- `yarn run check` and `yarn run test:unit` pass.

## Depends on

none

## Notes

Low risk. The only DI caller today is `notifyOnNewComment` in `model-comment.service.ts`, which
already awaits inside `Promise.allSettled` and logs rejections at lines 147-156 — so the change
activates error handling that was written but unreachable, rather than introducing a new
failure path.

`src/lib/auth.ts` imports `transporter` directly rather than going through `mailService`, so it
is unaffected.
