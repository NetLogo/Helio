// E2E: profile settings.
//
// Notes for source-side maintainers:
// - `ProfileSettingsAccountCard.vue` currently exposes display name as
//   read-only ("Name editing is not available in this app yet."). Once the
//   editable field exists, the test below should target it via `getByLabel`.
//   Until then, the editable surface is the visibility switch + user-kind
//   radio group on `ProfileSettingsPreferencesCard.vue` — that's what the
//   test exercises.
// - The visibility switch has `title="Visible to other users"`; we locate it
//   via `getByRole("switch")`. A `data-testid="profile-visibility"` would
//   make the locator clearer.
// - Sign-out flow shares the same dropdown limitation flagged in
//   `auth-signup-login.test.ts` — `data-testid="user-menu"` /
//   `data-testid="sign-out"` would help.

import { describe, it } from "vitest";
import { e2eSetup } from "./setup";

describe("profile: settings", async () => {
  await e2eSetup();

  it.todo(
    "signs in, toggles profile visibility, saves, reloads, asserts persisted, signs out (needs verified signed-in user)",
  );

  // Sketch:
  //
  // const user = await signUpAndVerify(page);
  // await signIn(page, user);
  // await page.goto(url("/profile/settings"));
  // const switchEl = page.getByRole("switch").first();
  // const initial = await switchEl.getAttribute("aria-checked");
  // await switchEl.click();
  // await page.getByRole("button", { name: /Save changes/i }).click();
  // await page.getByText(/Profile updated/i).waitFor();
  // await page.reload();
  // const after = await switchEl.getAttribute("aria-checked");
  // expect(after).not.toBe(initial);
});
