import type { Page } from "playwright-core";
import { expect } from "vitest";

/**
 * The clickable target for a model card on `/models`.
 *
 * Each card (`UBlogPost`) renders an `<article>` whose direct child is a
 * full-card overlay `<a href class="absolute inset-0">`. Scoping to `article`
 * keeps navbar links such as `/models/upload` out of the match.
 */
export const modelCardLink = "article > a[href^='/models/']";

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
