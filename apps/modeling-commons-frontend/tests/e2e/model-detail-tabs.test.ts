// E2E: switch between Discussion / Files / Versions / Family tabs and
// toggle the like button on a model.
//
// Notes for source-side maintainers:
// - Tab buttons in `ModelDetail.vue` are unlabelled `<button>`s in a flex
//   container. They have no `role="tab"`. We locate them by visible text.
//   Adding `role="tab"` plus an aria-controls/data-testid would make this
//   journey more robust.
// - The like button in `ModelBottomBar.vue` (via `ModelLike.vue`) is a UButton with text "Like" /
//   "Liked". Locating it by accessible name works today.
// - The like persistence assertion needs a verified, signed-in user, obtained
//   via `signUpAndVerify` (drives the real verification handshake by reading
//   the email from Mailpit).

import type { Locator } from "playwright-core";
import { describe, expect, it } from "vitest";
import { createPage } from "@nuxt/test-utils/e2e";
import { appUrl, e2eSetup } from "./setup";
import { signUpAndVerify } from "./helpers/auth";
import { dumpOnFailure } from "./helpers/debug";

// A real model card overlay link (`/models/<slug>/<id>`). When signed in, the
// navbar also renders an `<a href="/models/upload">` whose icon `<span>` matches
// the generic card selector and sorts first in DOM order — exclude it so the
// first match is always a model card.
const modelCardLink = "a[href^='/models/']:not([href='/models/upload']) span";

// The tab `@click` can lag visibility after an SPA navigation (the detail view
// is wrapped in <Suspense>), so a single click may land before the handler is
// wired. Retry the click until the button reports the active border.
async function activateTab(tab: Locator): Promise<void> {
  await expect
    .poll(
      async () => {
        await tab.click();
        return tab.evaluate((el) => el.className);
      },
      { timeout: 15_000, interval: 300 },
    )
    .toContain("border-primary");
}

describe("model detail: tabs and likes", async () => {
  await e2eSetup();

  it("can switch between the four tabs on a model detail page", async () => {
    const page = await createPage();
    await page.goto(appUrl("/models"));

    const firstCard = page.locator(modelCardLink).first();
    if (!(await firstCard.count())) {
      await page.close();
      return; // empty seed; nothing to test
    }
    await firstCard.click();
    await page.waitForURL(
      (u) => u.pathname.startsWith("/models/") && u.pathname !== "/models/upload",
    );

    // Tabs are buttons containing the labels.
    const discussion = page.getByRole("button", { name: /^Discussion$/ });
    const files = page.getByRole("button", { name: /^Files$/ });
    const versions = page.getByRole("button", { name: /^Versions/ });
    const family = page.getByRole("button", { name: /^Family$/ });

    await discussion.waitFor({ timeout: 15_000 });

    await activateTab(files);
    await activateTab(versions);
    await activateTab(family);
    await activateTab(discussion);

    await page.close();
  });

  it("like button toggles and persists across reload", async () => {
    const label = "model-like-persist";
    const page = await createPage();
    try {
      await signUpAndVerify(page);
      await page.goto(appUrl("/models"));

      const firstCard = page.locator(modelCardLink).first();
      if (!(await firstCard.count())) {
        await page.close();
        return; // empty seed; nothing to test
      }
      await firstCard.click();
      await page.waitForURL(
        (u) => u.pathname.startsWith("/models/") && u.pathname !== "/models/upload",
      );

      const likeButton = page.getByRole("button", { name: /^(Like|Liked)$/ });
      await likeButton.waitFor({ timeout: 15_000 });

      const wasLiked = (await likeButton.textContent())?.trim() === "Liked";
      const expected = wasLiked ? "Like" : "Liked";

      // The toggle handler early-returns if the reactive session hasn't hydrated
      // yet (it shows a "requires login" toast instead of toggling), and the
      // @click can also land before hydration on this <Suspense>-wrapped view.
      // Click only while the label still reads the original state, then let the
      // next poll iteration observe the optimistic flip — this both retries the
      // pre-hydration no-op click and avoids ever double-toggling.
      await expect
        .poll(
          async () => {
            const current = (await likeButton.textContent())?.trim();
            if (current !== expected) {
              await likeButton.click();
            }
            return current;
          },
          { timeout: 20_000, interval: 750 },
        )
        .toBe(expected);

      await page.reload();
      await expect
        .poll(
          () =>
            page
              .getByRole("button", { name: /^(Like|Liked)$/ })
              .textContent()
              .then((t) => t?.trim()),
          { timeout: 15_000 },
        )
        .toBe(expected);

      await page.close();
    } catch (err) {
      await dumpOnFailure(page, label, err);
    }
  });
});
