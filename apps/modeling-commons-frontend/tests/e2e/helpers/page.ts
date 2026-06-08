import type { Page } from "playwright-core";
import { expect } from "vitest";

/**
 * The clickable target for a model card on `/models`.
 *
 * Each card (`UBlogPost`) is a full-card overlay link rendered as
 * `<a href tabindex="-1"><span class="absolute inset-0" /></a>`. The `<a>` itself
 * collapses to zero height (its only child is absolutely positioned), so it
 * reports as hidden and `.click()`/`.waitFor()` on it time out. The stretched
 * `span` is the actual visible, clickable hit area — and there's exactly one per
 * card, so it also works for `.count()`.
 */
export const modelCardLink = "a[href^='/models/'] span";

/**
 * Asserts the loaded page is the expected one.
 *
 * Tolerant of pages whose identity lives only in the document `<title>` rather
 * than a visible heading — e.g. `/models`, whose first rendered heading is a
 * dynamic model-card title and whose "Explore Models" label exists only in the
 * SSR title. Matches `identity` against the first heading's text OR the title;
 * a heading need not exist (an empty `/models` renders none).
 */
export async function expectPageIdentity(
  page: Page,
  identity: RegExp,
  label = "",
): Promise<void> {
  const heading = page.locator("h1, h2, h3, h4, h5, h6").first();
  const headingText = await heading
    .textContent({ timeout: 15_000 })
    .catch(() => null);
  const title = await page.title();
  const prefix = label ? `${label}: ` : "";
  expect(
    (headingText !== null && identity.test(headingText)) || identity.test(title),
    `${prefix}expected heading or title to match ${identity} (heading=${JSON.stringify(headingText)}, title=${JSON.stringify(title)})`,
  ).toBe(true);
}
