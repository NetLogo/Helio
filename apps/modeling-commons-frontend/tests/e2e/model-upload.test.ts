// E2E: signed-in user uploads a model end-to-end.
//
// Notes for source-side maintainers:
// - `NetlogoFileUpload.vue` only accepts `.nlogox` (XML format). The shared
//   fixture `tests/fixtures/sample.nlogox` is what gets attached.
// - The `<input type="file">` is rendered inside `UFileUpload`. We locate it
//   with `page.locator("input[type=file]")` and call `setInputFiles`. A
//   `data-testid="primary-file-input"` on the wrapper would be cleaner.
// - The publish button is `getByRole("button", { name: "Publish" })`.
// - A verified, signed-in user is obtained via `signUpAndVerify`, which drives
//   the real verification handshake by reading the email from Mailpit.

import { describe, it } from "vitest";
import { createPage } from "@nuxt/test-utils/e2e";
import { appUrl, e2eSetup } from "./setup";
import { signUpAndVerify } from "./helpers/auth";
import { sampleNlogoxPath } from "./helpers/fixtures";
import { dumpOnFailure } from "./helpers/debug";

describe("models: upload journey", async () => {
  await e2eSetup({
    // Uploads + publish round-trip tend to exceed the project default.
    testTimeout: 120_000,
  });

  it(
    "signs in a verified user, attaches sample.nlogox, sets visibility public, publishes, lands on the new model detail page",
    async () => {
      const label = "model-upload";
      const page = await createPage();
      try {
        await signUpAndVerify(page);
        await page.goto(appUrl("/models/upload"));

        const title = `E2E Model ${Date.now()}`;
        const fileInput = page.locator("input[type=file]").first();
        await fileInput.setInputFiles(sampleNlogoxPath);
        await page.getByLabel("Title").fill(title);
        await page.getByRole("button", { name: /Set Permissions/i }).click();
        await page.getByRole("radio", { name: /Public/i }).check();
        await page.getByRole("button", { name: "Publish" }).click();
        // Publish navigates to the new model's detail page (/models/<id>, which
        // may canonicalize to /models/<slug>/<id>); just not back to /upload.
        await page.waitForURL(
          (u) => u.pathname.startsWith("/models/") && u.pathname !== "/models/upload",
          { timeout: 60_000 },
        );
        await page.getByText(title).first().waitFor({ state: "visible", timeout: 30_000 });

        // Reload and confirm the published model persists.
        await page.reload();
        await page.getByText(title).first().waitFor({ state: "visible", timeout: 30_000 });
        await page.close();
      } catch (err) {
        await dumpOnFailure(page, label, err);
      }
    },
  );
});
