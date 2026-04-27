// E2E: start an upload, navigate away, return via /profile/drafts, resume.
//
// Notes for source-side maintainers:
// - The drafts table action menu is a `UDropdownMenu` with no stable testid.
//   Adding `data-testid="draft-actions"` and `data-testid="draft-resume"`
//   would make this test less locator-fragile.
// - Both this and `model-upload.test.ts` need a verified signed-in user, so
//   the journey is gated behind `it.todo` until backend test-token retrieval
//   exists.

import { describe, it } from "vitest";
import { e2eSetup } from "./setup";

describe("models: draft resume journey", async () => {
  await e2eSetup({ testTimeout: 120_000 });

  it.todo(
    "starts an upload, navigates away, opens /profile/drafts, clicks Resume editing, completes publish (needs verified signed-in user)",
  );

  // Sketch:
  //
  // const user = await signUpAndVerify(page);
  // await signIn(page, user);
  // await page.goto(url("/models/upload"));
  // await page.locator("input[type=file]").first().setInputFiles(sampleNlogoxPath);
  // await page.getByLabel("Title").fill(`Draft ${Date.now()}`);
  // // Wait for "Saved" to flip from "Saving…".
  // await page.getByText(/^Saved$/).waitFor();
  // await page.goto(url("/profile/drafts"));
  // await page.getByRole("button", { name: /more/i }).first().click();
  // await page.getByRole("menuitem", { name: /Resume editing/i }).click();
  // await page.waitForURL(/\/models\/upload\?draft=/);
  // await page.getByRole("button", { name: "Publish" }).click();
  // await page.waitForURL(/\/models\/[^/]+$/);
});
