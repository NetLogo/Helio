// E2E: start an upload, navigate away, return via /profile/drafts, resume.
//
// Notes for source-side maintainers:
// - The drafts table action menu is a `UDropdownMenu` with no stable testid.
//   Adding `data-testid="draft-actions"` and `data-testid="draft-resume"`
//   would make this test less locator-fragile.
// - A verified, signed-in user is obtained via `signUpAndVerify`, which drives
//   the real verification handshake by reading the email from Mailpit.

import { describe, expect, it } from "vitest";
import { createPage } from "@nuxt/test-utils/e2e";
import { appUrl, e2eSetup } from "./setup";
import { signUpAndVerify } from "./helpers/auth";
import { sampleNlogoxPath } from "./helpers/fixtures";
import { dumpOnFailure } from "./helpers/debug";

describe("models: draft resume journey", async () => {
  await e2eSetup({ testTimeout: 120_000 });

  it(
    "starts an upload, navigates away, opens /profile/drafts, clicks Resume editing, completes publish",
    async () => {
      const label = "model-draft-resume";
      const page = await createPage();
      try {
        await signUpAndVerify(page);
        await page.goto(appUrl("/models/upload"));
        await page.locator("input[type=file]").first().setInputFiles(sampleNlogoxPath);

        const draftTitle = `Draft ${Date.now()}`;
        // The title is persisted via a 500ms-debounced PATCH. "Saved" only tracks
        // the `saving` flag, which is false during the debounce window, so it can
        // flip to "Saved" before the title is actually written. Publishing a
        // titleless draft is (correctly) refused, so wait for the PATCH that
        // carries this title to land before navigating away.
        const titleSaved = page.waitForResponse(
          (r) =>
            /\/api\/v1\/model-drafts\/[^/]+$/.test(r.url()) &&
            r.request().method() === "PATCH" &&
            (r.request().postData() ?? "").includes(draftTitle) &&
            r.ok(),
          { timeout: 30_000 },
        );
        await page.getByLabel("Title").fill(draftTitle);
        await titleSaved;
        await page.getByText(/^Saved$/).waitFor({ timeout: 30_000 });

        await page.goto(appUrl("/profile/drafts"));
        // The drafts table row action is a UDropdownMenu trigger UButton whose
        // only content is an icon, so it has no accessible name. The nav menus
        // also expose `aria-haspopup="menu"` triggers, so scope to the drafts
        // <table> — there's exactly one trigger there (one draft row on a fresh
        // account).
        const actionsTrigger = page.locator("table button[aria-haspopup='menu']").first();
        await actionsTrigger.waitFor({ state: "visible", timeout: 30_000 });

        // Reka's dropdown opens on the trigger's pointer handlers; a click that
        // lands before hydration (or that races the menu's outside-click close)
        // leaves it collapsed. Open it via keyboard (focus + Enter, which Reka
        // also handles) and retry until it reports expanded, then pick the
        // "Resume editing" link item.
        const resumeItem = page.getByRole("menuitem", { name: /Resume editing/i });
        await expect
          .poll(
            async () => {
              if ((await actionsTrigger.getAttribute("aria-expanded")) !== "true") {
                await actionsTrigger.focus();
                await actionsTrigger.press("Enter");
              }
              return resumeItem.isVisible();
            },
            { timeout: 20_000, interval: 750 },
          )
          .toBe(true);
        await resumeItem.click();

        await page.waitForURL(/\/models\/upload\?draft=/, { timeout: 30_000 });
        // The resumed editor hydrates the draft before showing the stepper; wait
        // for the Publish button to be ready, then publish.
        const publish = page.getByRole("button", { name: "Publish" });
        await publish.waitFor({ state: "visible", timeout: 30_000 });
        await publish.click();
        // Publish navigates to the new model's detail page (/models/<id>, which
        // canonicalizes to /models/<slug>/<id>); just not back to /upload.
        await page.waitForURL(
          (u) => u.pathname.startsWith("/models/") && u.pathname !== "/models/upload",
          { timeout: 60_000 },
        );
        await page.close();
      } catch (err) {
        await dumpOnFailure(page, label, err);
      }
    },
    120_000,
  );
});
