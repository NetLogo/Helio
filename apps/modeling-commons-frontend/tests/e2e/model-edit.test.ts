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

import { describe, expect, it } from "vitest";
import { createPage } from "@nuxt/test-utils/e2e";
import { appUrl, e2eSetup } from "./setup";
import { signUpAndVerify } from "./helpers/auth";
import { sampleNlogoPath, sampleNlogoxPath } from "./helpers/fixtures";
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

        // The editor opens on the "Add Details" step, so the title field is in the
        // DOM immediately — but the draft hydrates asynchronously, and the title
        // watcher that drives the autosave PATCH is gated while `hydrating` is true.
        // Filling before hydration settles silently no-ops (no PATCH ever fires).
        // Wait for the input to carry the hydrated base title before editing it.
        const renamed = `${baseTitle} (renamed)`;
        const titleInput = page.getByLabel("Model Title");
        await expect
          .poll(() => titleInput.inputValue(), { timeout: 30_000, interval: 250 })
          .toBe(baseTitle);

        // The title is persisted via a 500ms-debounced PATCH; the "Saved" indicator
        // can flip before the title actually lands (it only tracks the
        // `saving`/`pendingWrite` flags). Publish only flushes patches the watcher
        // has already scheduled, so a click that races the debounce would publish
        // without the rename. Wait for the PATCH carrying the new title (and the
        // "Saved" indicator) before publishing.
        const titleSaved = page.waitForResponse(
          (r) =>
            /\/api\/v1\/model-drafts\/[^/]+$/.test(r.url()) &&
            r.request().method() === "PATCH" &&
            (r.request().postData() ?? "").includes(renamed) &&
            r.ok(),
          { timeout: 30_000 },
        );
        // Change ONLY the title — do not touch the file input.
        await titleInput.fill(renamed);
        await titleSaved;
        await page.getByText(/^Saved$/).waitFor({ timeout: 30_000 });

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

        // The draft hydrates asynchronously, and the file watcher that stages a
        // replaced primary file is gated while `hydrating` is true — setting the
        // file too early silently no-ops. Wait for the title input to carry the
        // hydrated base title as a proxy for "hydration settled, watchers live".
        await expect
          .poll(() => page.getByLabel("Model Title").inputValue(), {
            timeout: 30_000,
            interval: 250,
          })
          .toBe(baseTitle);

        // Replace the PRIMARY file. The edit view renders multiple file inputs
        // (the preview-image picker in "Add Details", plus the Model/Additional
        // Files zones in "Add Files"), and `input[type=file]` first()` would hit
        // the preview-image input — which feeds the thumbnail, not the model.
        // `data-testid="primary-file-uploader"` (ModelDraftNetlogoFileCard.vue)
        // scopes us to the primary NetLogo file control. Re-uploading the same
        // fixture still counts as a replacement — detection is key-based.
        const primaryFileInput = page.locator(
          '[data-testid="primary-file-uploader"] input[type=file]',
        );
        await primaryFileInput.waitFor({ state: "attached", timeout: 30_000 });
        // Replacing the primary file stages it via a POST .../files (role=primary)
        // and then PATCHes the draft. Publish only flushes already-scheduled work,
        // so a click that races the upload would publish the old file. Wait for the
        // upload POST and the "Saved" indicator before publishing.
        const primaryUploaded = page.waitForResponse(
          (r) =>
            /\/api\/v1\/model-drafts\/[^/]+\/files$/.test(r.url()) &&
            r.request().method() === "POST" &&
            r.ok(),
          { timeout: 60_000 },
        );
        await primaryFileInput.setInputFiles(sampleNlogoxPath);
        await primaryUploaded;
        await page.getByText(/^Saved$/).waitFor({ timeout: 30_000 });

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

  it(
    "adding a model file creates a new version",
    async () => {
      const label = "model-edit-add-model-file-bump";
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

        // The editor is a UStepper that renders only the active step's slot, and
        // it opens on "Add Details". The "Model Files" zone lives in the
        // "Add Files" step, so switch to it before the input is in the DOM. Reka
        // can swallow a click that lands before the trigger is interactive, so
        // retry the click until the Model Files input is attached.
        const filesStep = page.getByRole("button", { name: /Add Files/i });
        await filesStep.waitFor({ state: "visible", timeout: 30_000 });
        // `data-testid="model-files-uploader"` (FileUploadCard.vue) scopes us to
        // the Model Files zone so we don't accidentally touch the primary file
        // (the page has primary, model-files, and additional-files inputs).
        const modelFilesInput = page.locator(
          '[data-testid="model-files-uploader"] input[type=file]',
        );
        const stepDeadline = Date.now() + 30_000;
        while (Date.now() < stepDeadline) {
          await filesStep.click().catch(() => undefined);
          if (await modelFilesInput.count()) break;
          await page.waitForTimeout(400);
        }
        await modelFilesInput.waitFor({ state: "attached", timeout: 15_000 });

        // Drop any file into the "Model Files" zone — NOT the primary file
        // input. Reuse the existing .nlogo fixture; a model file can be any file.
        await modelFilesInput.setInputFiles(sampleNlogoPath);

        await publish.click();
        // Edit publish navigates back to the model detail page (not /edit).
        await page.waitForURL(
          (u) => u.pathname.startsWith("/models/") && !u.pathname.endsWith("/edit"),
          { timeout: 60_000 },
        );

        // Adding a model file changes the model-file set, which MUST bump the
        // version: reload the detail page and assert "Versions (2)".
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
