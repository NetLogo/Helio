# User Profile Editing + Extended Profile Fields

## Context

The profile settings page (`app/pages/profile/settings.vue`) currently only lets users toggle `isProfilePublic` and pick a `userKind`. Name, avatar, and any "about me" data are stuck at whatever better-auth initialized at signup. The settings page even has a visible roadmap placeholder for avatar uploads.

We want to:
1. Let users edit their **name** and **profile picture** (`image`).
2. Add **extended optional profile fields** so a user can describe themselves: bio, country, affiliation (school/company/org), location (city), website, pronouns.
3. Keep the existing self-or-admin authorization and `isProfilePublic` visibility gate. Extended fields are visible to others only when the profile is public.

No backcompat constraints (pre-beta, solo-authored).

---

## Chosen shape (brief)

- **Extend the `User` table directly** — matches the existing pattern where `userKind` / `isProfilePublic` are columns on `User`, not a separate profile table. One migration, no joins.
- **Reuse `PATCH /v1/users/:id`** for all scalar field edits (name + new fields). Avoid a parallel endpoint.
- **Avatar = dedicated multipart route** mirroring the model-draft file upload pattern: `POST /v1/users/:id/avatar` + `DELETE /v1/users/:id/avatar`. Stores in S3 via `fileService.upload` with `access: 'public-read'` and prefix `avatars/{userId}/`, then writes the public URL into `user.image`.
- **Public view** gains the new fields (gated by `isProfilePublic`) so public profiles are actually worth visiting.

---

## New profile fields (final list)

| Field | Type | Notes |
|---|---|---|
| `bio` | `String?` (maxLength 1000) | Markdown allowed; rendered via existing `utils/markdown.ts` on FE. |
| `country` | `String?` (length 2) | ISO-3166-1 alpha-2 code. Backend validates against a static allowlist. |
| `affiliation` | `String?` (maxLength 200) | Freeform: "Northwestern University", "Anthropic", etc. |
| `affiliationKind` | enum `school \| company \| organization \| other` | Optional label for the affiliation. |
| `location` | `String?` (maxLength 120) | City-level freeform. |
| `website` | `String?` (maxLength 500, url format) | Single URL. |
| `pronouns` | `String?` (maxLength 40) | Freeform (avoid enum — too culturally scoped). |

Name is already on `User` — no schema change, just unlock editing.

---

## Backend changes

### 1. Prisma + migration
**File:** `prisma/schema.prisma` — extend `User` model (after `isProfilePublic`):
```prisma
bio             String?
country         String?  @db.Char(2)
affiliation     String?
affiliationKind AffiliationKind?
location        String?
website         String?
pronouns        String?
```
Add `enum AffiliationKind { school company organization other }` near `UserKind`.

**New migration:** `prisma/migrations/20260424_user_profile_fields/migration.sql` (additive, nullable columns; safe on existing rows).

Run `yarn prisma migrate dev` + `yarn prisma generate` (re-generates `generated/prisma/`).

### 2. Better-auth config
**File:** `src/lib/auth.ts:17-28` — extend `user.additionalFields`:
```ts
bio: { type: 'string', required: false },
country: { type: 'string', required: false },
affiliation: { type: 'string', required: false },
affiliationKind: { type: 'string', required: false },
location: { type: 'string', required: false },
website: { type: 'string', required: false },
pronouns: { type: 'string', required: false },
```
Required so better-auth's session serializer includes them — otherwise the frontend `useUser` composable won't see them.

### 3. Domain types
**File:** `src/modules/user/domain/user.types.ts`
- Add new fields to `UserEntity`.
- Add `AffiliationKind` const + type (mirror `UserKind` pattern).
- Extend `UpdateUserProfileProps` to include `name` + all seven new fields (all optional).
- Extend `UserPublicView` to include `image`, `bio`, `country`, `affiliation`, `affiliationKind`, `location`, `website`, `pronouns`, `userKind`. Keep `email`/`systemRole` private.

### 4. Domain logic
**File:** `src/modules/user/domain/user.domain.ts`
- Update `extractPublicView` to project the new fields.
- Add validators for `country` (ISO-2 allowlist), `website` (URL parse), `bio` / `affiliation` / `location` / `pronouns` length caps. Throw `ArgumentInvalidException` — mirrors existing pattern.

### 5. DTOs
**File:** `src/modules/user/user.schemas.ts:24-33` — extend `updateUserRequestDtoSchema` with `name` + the seven new fields (all `Type.Optional`, with the proper `minLength/maxLength/format`). Export an `AffiliationKindDto` const alongside `UserKindDto`.

**File:** `src/modules/user/dtos/user.response.dto.ts` — add the new fields as `Type.Union([..., Type.Null()])`.

**File:** `src/modules/user/dtos/user.public.response.dto.ts` — add `image` + the seven new fields + `userKind` (everything in the public view).

### 6. Service
**File:** `src/modules/user/user.service.ts:24-57` — extend `updateProfile`:
- Whitelist copy the new fields into `updateData` (same pattern as existing).
- Before writing, call the new domain validators.
- Keep the existing transaction + `user.updated` event. Empty strings from the FE get normalized to `null` (treat `""` as clear).

### 7. Avatar upload routes
**New file:** `src/modules/user/user.avatar.service.ts` — dedicated service methods `uploadAvatar(userId, requesterId, requesterRole, { buffer, filename, contentType })` and `deleteAvatar(userId, requesterId, requesterRole)`.
- Allowed content types: `image/png`, `image/jpeg`, `image/webp`. Max 5MB (tighter than the 30MB global cap; enforce before calling `fileService`).
- Key: `fileService.upload({ ..., access: 'public-read', pathPrefix: \`avatars/${userId}\` })`.
- Write the resulting public URL (`fileService.getUrl(key)`) to `user.image` in the same transaction. Emit `user.avatar.updated` event.
- On delete: set `image = null`, emit `user.avatar.deleted`. (S3 GC is out of scope; log the orphan key for later.)

**File:** `src/modules/user/user.route.ts` — add:
- `POST /v1/users/:id/avatar` (multipart, field `file`) — mirror `model-draft.route.ts:97-141` exactly for the buffer copy + zero-fill pattern. Return `200 { image: string }`.
- `DELETE /v1/users/:id/avatar` — return `204`.

**File:** `src/modules/user/index.ts` — register `userAvatarService` in awilix.

### 8. Tests
- Unit: `user.domain.spec.ts` — validators + public view projection.
- Integration: `user.service.spec.ts` — name edit, field edits, validator rejections, self-vs-admin authz, empty-string-clears-field.
- Integration: new `user.avatar.spec.ts` — upload happy path, wrong mime type rejected, size cap, delete clears `image`.

### 9. AdminJS
**File:** `src/server/plugins/adminjs.ts` — expose the new columns on the User resource (read-only for moderators, editable for admins) so support can edit them without shipping FE tooling.

---

## Frontend changes

### 1. Composable: extend `useProfileSettings`
**File:** `app/composables/useProfileSettings.ts`
- Add refs: `name`, `bio`, `country`, `affiliation`, `affiliationKind`, `location`, `website`, `pronouns`.
- Extend `isDirty` computed to cover all of them.
- Extend `resetForm` to copy from `profile.value`.
- Extend the `PATCH` body at line 136 to include the new fields. Trim strings; send empty strings as `null` so the backend can clear.

### 2. New composable: `useUploadAvatar`
**New file:** `app/composables/useUploadAvatar.ts`
- FormData POST to `/api/v1/users/{id}/avatar` (mirror `useModelDraft.ts:168-197`).
- Also export `deleteAvatar()` hitting the DELETE route.
- After success, call `refresh()` from `useProfile` + invalidate the better-auth session so the navbar avatar updates.

### 3. Settings page cards
**File:** `app/pages/profile/settings.vue`
- Replace the "roadmap" placeholder (lines 85-103) with two real cards:
  - `ProfileSettingsAvatarCard` — shows current avatar, "Upload new" / "Remove" buttons wired to `useUploadAvatar`. Drag-drop optional, not required.
  - `ProfileSettingsAboutCard` — name input + textarea for bio + country select (static ISO list in `app/utils/countries.ts`, new file) + affiliation + affiliationKind radio/select + location + website + pronouns. Single "Save" button reuses `saveProfileSettings()` from the existing composable.
- Keep `ProfileSettingsPreferencesCard` as-is.

### 4. Public profile display
If a public profile page exists (see `app/pages/users/[id]/` or similar — verify during implementation), surface the new public fields there. If not, out of scope for this plan — track as follow-up.

### 5. Navbar
**File:** `app/components/ClientNavbar.vue` — no code change needed; it already reads `user.image` and `user.name`. Just verify the session refresh after avatar upload propagates.

---

## Critical files to modify

**Backend**
- `prisma/schema.prisma` + new migration dir
- `src/lib/auth.ts`
- `src/modules/user/domain/user.types.ts`
- `src/modules/user/domain/user.domain.ts`
- `src/modules/user/user.schemas.ts`
- `src/modules/user/dtos/user.response.dto.ts`
- `src/modules/user/dtos/user.public.response.dto.ts`
- `src/modules/user/user.service.ts`
- `src/modules/user/user.route.ts`
- `src/modules/user/user.mapper.ts` (add new fields to record↔domain↔response mapping)
- `src/modules/user/index.ts`
- `src/modules/user/user.avatar.service.ts` **(new)**
- `src/server/plugins/adminjs.ts`

**Frontend**
- `app/composables/useProfileSettings.ts`
- `app/composables/useUploadAvatar.ts` **(new)**
- `app/pages/profile/settings.vue`
- `app/components/profile/ProfileSettingsAvatarCard.vue` **(new)**
- `app/components/profile/ProfileSettingsAboutCard.vue` **(new)**
- `app/utils/countries.ts` **(new, static ISO-3166 list)**

---

## Reused utilities

- `fileService.upload()` / `fileService.getUrl()` — `src/modules/file/file.service.ts` (avatars go through the same S3 path as everything else).
- Multipart handling pattern — copy from `src/modules/model-draft/model-draft.route.ts:97-141`.
- `transactionManager.run()` + `eventRepository.insert()` — existing service pattern.
- `utils/markdown.ts` — already used for model descriptions; reuse for bio rendering.
- `ResponseSuccessData` typed fetch wrappers — the FE already consumes OpenAPI types; no new plumbing needed.

---

## Verification

1. `yarn prisma migrate dev` + `yarn prisma generate` succeed; `generated/prisma/` updates.
2. `yarn run deps:validate` passes (no new cross-module imports).
3. `yarn test` passes — new domain / service / integration specs green.
4. **Manual (FE):**
   - Log in, open `/profile/settings`.
   - Change name → Save → navbar shows new name.
   - Upload a PNG avatar → navbar avatar updates within a session refresh.
   - Upload a `.exe` → rejected with a clear error.
   - Fill bio/country/affiliation/website → Save → reload page → values persist.
   - Clear a field (submit empty) → stored as `null`.
   - Toggle `isProfilePublic` off, open profile in an incognito window → extended fields hidden; only name/public basics visible.
5. **OpenAPI sanity:** hit `/docs` (Scalar) — new PATCH body fields + avatar routes are documented.
