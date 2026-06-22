// E2E: edit an existing model and exercise draft-publish versioning.
//
// These journeys cover the no-bump vs bump rule: editing metadata only (e.g.
// the title) must NOT create a new version, while replacing the NetLogo file
// MUST create one. Each test creates a fresh model via the upload flow, then
// edits it through `ModelDraftEditor mode="edit"` (mounted by
// `pages/models/[id]/edit.vue`).
//
// Prerequisites (same as the other authed e2e specs): a running backend +
// Mailpit. A verified, onboarded, signed-in user is obtained via
// `signUpAndVerify`, which drives the real verification handshake by reading
// the email from Mailpit.
//
// Notes for source-side maintainers:
// - The edit page mounts `ModelDraftEditor` with `mode="edit"`; its title field
//   is labeled "Model Title" (`AddDetailsCard.vue`) and the replace-file control
//   is the `<input type="file">` inside `UFileUpload` (button text "Replace
//   file"). A `data-testid` on each would make these less locator-fragile.
// - On a successful edit, the editor toasts "Model updated" (vs "Model
//   published" for new models) and navigates back to the model detail page.
// - The detail page's Versions tab label reads `Versions (<n>)`.

import { describe, it } from "vitest";
import { createPage } from "@nuxt/test-utils/e2e";
import { appUrl, e2eSetup } from "./setup";
import { signUpAndVerify } from "./helpers/auth";
import { sampleNlogoxPath } from "./helpers/fixtures";
import { dumpOnFailure } from "./helpers/debug";

describe("models: edit journey", async () => {
  await e2eSetup();

  it(
    "editing only the title does not create a new version",
    async () => {
      const label = "model-edit-title-no-bump";
      const page = await createPage();
      try {
        await signUpAndVerify(page);

        // Create a fresh model via the upload flow to edit.
        const baseTitle = `E2E Edit Base ${Date.now()}`;
        await page.goto(appUrl("/models/upload"));
        await page.locator("input[type=file]").first().setInputFiles(sampleNlogoxPath);
        await page.getByLabel("Title").fill(baseTitle);
        await page.getByRole("button", { name: /Set Permissions/i }).click();
        await page.getByRole("radio", { name: /Public/i }).check();
        await page.getByRole("button", { name: "Publish" }).click();
        // Publish navigates to the new model's detail page (/models/<id>, which
        // may canonicalize to /models/<slug>/<id>); just not back to /upload.
        await page.waitForURL(
          (u) => u.pathname.startsWith("/models/") && u.pathname !== "/models/upload",
          { timeout: 60_000 },
        );
        // The model id is the last segment of the detail URL.
        const modelId = new URL(page.url()).pathname.split("/").filter(Boolean).pop()!;

        // Enter the editor directly (more robust than the detail-page dropdown).
        await page.goto(appUrl(`/models/${modelId}/edit`));
        const publish = page.getByRole("button", { name: "Publish" });
        await publish.waitFor({ state: "visible", timeout: 30_000 });

        // Change ONLY the title — do not touch the file input.
        await page.getByLabel("Model Title").fill(`${baseTitle} (renamed)`);

        await publish.click();
        // Edit publish navigates back to the model detail page (not /edit).
        await page.waitForURL(
          (u) => u.pathname.startsWith("/models/") && !u.pathname.endsWith("/edit"),
          { timeout: 60_000 },
        );

        // A metadata-only edit must NOT bump the version: reload the detail page
        // and assert the Versions tab still reads "Versions (1)".
        await page.goto(appUrl(`/models/${modelId}`));
        await page
          .getByText(/Versions \(1\)/)
          .first()
          .waitFor({ state: "visible", timeout: 30_000 });

        await page.close();
      } catch (err) {
        await dumpOnFailure(page, label, err);
      }
    },
    120_000,
  );

  it(
    "replacing the NetLogo file creates a new version",
    async () => {
      const label = "model-edit-file-bump";
      const page = await createPage();
      try {
        await signUpAndVerify(page);

        // Create a fresh model via the upload flow to edit.
        const baseTitle = `E2E Edit Base ${Date.now()}`;
        await page.goto(appUrl("/models/upload"));
        await page.locator("input[type=file]").first().setInputFiles(sampleNlogoxPath);
        await page.getByLabel("Title").fill(baseTitle);
        await page.getByRole("button", { name: /Set Permissions/i }).click();
        await page.getByRole("radio", { name: /Public/i }).check();
        await page.getByRole("button", { name: "Publish" }).click();
        // Publish navigates to the new model's detail page (/models/<id>, which
        // may canonicalize to /models/<slug>/<id>); just not back to /upload.
        await page.waitForURL(
          (u) => u.pathname.startsWith("/models/") && u.pathname !== "/models/upload",
          { timeout: 60_000 },
        );
        // The model id is the last segment of the detail URL.
        const modelId = new URL(page.url()).pathname.split("/").filter(Boolean).pop()!;

        // Enter the editor directly (more robust than the detail-page dropdown).
        await page.goto(appUrl(`/models/${modelId}/edit`));
        const publish = page.getByRole("button", { name: "Publish" });
        await publish.waitFor({ state: "visible", timeout: 30_000 });

        // Replace the primary file. Re-uploading the same fixture still counts as
        // a replacement — detection is key-based, not content-based.
        await page.locator("input[type=file]").first().setInputFiles(sampleNlogoxPath);

        await publish.click();
        // Edit publish navigates back to the model detail page (not /edit).
        await page.waitForURL(
          (u) => u.pathname.startsWith("/models/") && !u.pathname.endsWith("/edit"),
          { timeout: 60_000 },
        );

        // Replacing the file MUST bump the version: reload the detail page and
        // assert the Versions tab now reads "Versions (2)".
        await page.goto(appUrl(`/models/${modelId}`));
        await page
          .getByText(/Versions \(2\)/)
          .first()
          .waitFor({ state: "visible", timeout: 30_000 });

        await page.close();
      } catch (err) {
        await dumpOnFailure(page, label, err);
      }
    },
    120_000,
  );
});
