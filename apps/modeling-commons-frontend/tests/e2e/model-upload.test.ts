// E2E: signed-in user uploads a model end-to-end.
//
// Notes for source-side maintainers:
// - `NetlogoFileUpload.vue` only accepts `.nlogox` (XML format). The shared
//   fixture `tests/fixtures/sample.nlogox` is what gets attached.
// - The `<input type="file">` is rendered inside `UFileUpload`. We locate it
//   with `page.locator("input[type=file]")` and call `setInputFiles`. A
//   `data-testid="primary-file-input"` on the wrapper would be cleaner.
// - The publish button is `getByRole("button", { name: "Publish" })`.
// - This test depends on a verified signed-in user. Until backend test-token
//   retrieval lands, the test is gated behind `it.todo`.

import { describe, it } from "vitest";
import { e2eSetup } from "./setup";

describe("models: upload journey", async () => {
  await e2eSetup({
    // Uploads + publish round-trip tend to exceed the project default.
    testTimeout: 120_000,
  });

  it.todo(
    "signs in a verified user, attaches sample.nlogox, sets visibility public, publishes, lands on the new model detail page (needs backend test-token retrieval)",
  );

  // Sketch of the test once a verified user can be obtained:
  //
  // const user = await signUpAndVerify(page);
  // await signIn(page, user);
  // await page.goto(url("/models/upload"));
  // const fileInput = page.locator("input[type=file]").first();
  // await fileInput.setInputFiles(sampleNlogoxPath);
  // await page.getByLabel("Title").fill(`E2E Model ${Date.now()}`);
  // await page.getByRole("button", { name: /Set Permissions/i }).click();
  // await page.getByRole("radio", { name: /Public/i }).check();
  // await page.getByRole("button", { name: "Publish" }).click();
  // await page.waitForURL(/\/models\/[^/]+$/, { timeout: 60_000 });
  // // Reload and confirm persistence.
  // await page.reload();
  // await page.getByRole("link", { name: /Back to models/i }).waitFor();
});
