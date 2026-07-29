# .ongoing

Plans for future work. Nothing here is implemented until its task file is picked up and approved.

## Layout

`.ongoing/<project>/<task>/<pr>-<n>.md`

- `<project>` — optional, nestable (`billing/invoicing/...`).
- `<task>` — one coherent unit of work.
- `<pr>-<n>.md` — one file per planned PR; `<n>` is the intended merge order within the task (`schema-1.md`, `endpoints-2.md`).

## PR file contract

A PR is a very small part of the task with one clear goal. Required fields:

- **Goal** — one sentence.
- **In scope** / **Out of scope**
- **Description**
- **Acceptance criteria** — verifiable.
- **Depends on** — other PR files, or `none`.
- **Notes**

Additional fields (Risks, Rollback, Open questions, Status, …) at the author's discretion.

## Rules

- Can't state acceptance criteria → it's a task, not a PR. Split it.
- Delete a PR file when it merges. Stale plans are noise.
