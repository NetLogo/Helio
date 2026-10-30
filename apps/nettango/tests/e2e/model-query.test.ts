import { createPage, url } from "@nuxt/test-utils/e2e";
import { gotoHydrated } from "@repo/vitest-config/helpers/nuxt";
import { e2eSetup } from "@repo/vitest-config/helpers/smoke";
import type { Locator, Page } from "playwright-core";
import { describe, expect, it } from "vitest";

const HOST = process.env["E2E_HOST"] ?? "http://localhost:3003";
const DESKTOP = { width: 1280, height: 800 };
const PLAYER_PATH = "/assets/models/ants.html";

const openDesktopPage = async (): Promise<Page> => {
  const page = await createPage();
  await page.setViewportSize(DESKTOP);
  return page;
};

const getStartPaneError = (page: Page, share: number): Promise<number> =>
  page.getByRole("separator", { name: "Resize details and model" }).evaluate((handle, expected) => {
    const start = handle.previousElementSibling?.getBoundingClientRect().width ?? 0;
    const row = handle.parentElement?.getBoundingClientRect().width ?? 0;
    return Math.abs(start - expected * row);
  }, share);

const seedSidebarSettings = (page: Page, settings: { hidden: boolean; width: number }): Promise<void> =>
  page.addInitScript((raw) => {
    try {
      localStorage.setItem("nt-sidebar:model:ants", raw);
    } catch {
      // about:blank has no storage; the model page that follows does.
    }
  }, JSON.stringify(settings));

// Without its chunks the page never hydrates, so it stays at what the browser paints first.
const openWithoutScripts = async (): Promise<Page> => {
  const page = await openDesktopPage();
  await page.route("**/_nuxt/**", (route) =>
    route.request().resourceType() === "script" ? route.abort() : route.continue(),
  );
  return page;
};

// The pane that holds the player; the iframe fills it until the player reports its size.
const getPlayerPaneWidth = (page: Page): Promise<number> =>
  page.locator("iframe").evaluate((frame) => frame.parentElement?.parentElement?.getBoundingClientRect().width ?? 0);

const countWrapStyles = (page: Page): Promise<number> =>
  page.locator("iframe").evaluate(
    (frame: HTMLIFrameElement) => frame.contentDocument?.querySelectorAll("style#nt-player-wrap").length ?? 0,
  );

const getStageOverflow = (page: Page): Promise<number> =>
  page.locator("iframe").evaluate((frame) => {
    const stage = frame.parentElement?.parentElement;
    return stage ? stage.scrollWidth - stage.clientWidth : -1;
  });

const SKIP_LINK = { name: "Skip past the model" };

const waitForPlayer = (page: Page): Promise<unknown> =>
  page.locator("iframe").evaluate(
    (frame: HTMLIFrameElement) =>
      frame.contentDocument?.readyState === "complete" ||
      new Promise((resolve) => frame.addEventListener("load", resolve, { once: true })),
  );

// The player focuses its own view once it loads, so tabbing has to start from the page again.
const openPlayerPage = async (path: string): Promise<Page> => {
  const page = await openDesktopPage();
  await gotoHydrated(page, url(path));
  await waitForPlayer(page);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  return page;
};

const tabTo = async (page: Page, target: Locator): Promise<boolean> => {
  for (let step = 0; step < 40; step += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement)) return true;
  }
  return false;
};

const getActiveElementId = (page: Page): Promise<string | undefined> =>
  page.evaluate(() => document.activeElement?.id);

const countPlayerRequests = (page: Page): (() => number) => {
  let count = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === PLAYER_PATH) count += 1;
  });
  return () => count;
};

describe("model page", async () => {
  await e2eSetup(HOST);

  // Catches the prerendered default split (24 percent) surviving hydration and ignoring ?split=.
  it("sizes the start pane from ?split=", async () => {
    const page = await openDesktopPage();
    await gotoHydrated(page, url("/models/ants?split=60"));
    await expect.poll(() => getStartPaneError(page, 0.4)).toBeLessThanOrEqual(1);
    await page.close();
  });

  // Catches ?sidebar=hidden being ignored, or remounting the stage so the player loads twice.
  it("hides the start pane from ?sidebar=hidden and loads the player once", async () => {
    const page = await openDesktopPage();
    const getPlayerRequests = countPlayerRequests(page);
    await gotoHydrated(page, url("/models/ants?sidebar=hidden"));
    await expect.poll(() => page.getByRole("main").getByRole("button", { name: "Show details" }).isVisible()).toBe(true);
    await waitForPlayer(page);
    await page.waitForLoadState("networkidle");
    expect(getPlayerRequests()).toBe(1);
    await page.close();
  });

  // Catches a saved hidden sidebar flashing open before hydration.
  it("hides the start pane before hydration when hidden is saved", async () => {
    const page = await openWithoutScripts();
    await seedSidebarSettings(page, { hidden: true, ratio: 30 });
    await page.goto(url("/models/ants"), { waitUntil: "domcontentloaded" });
    expect(await page.locator("main [data-teacher-only]").isVisible()).toBe(false);
    await page.close();
  });

  // Catches the first paint using the default split instead of the saved one.
  it("sizes the start pane before hydration from the saved ratio", async () => {
    const page = await openWithoutScripts();
    await seedSidebarSettings(page, { hidden: false, ratio: 30 });
    await page.goto(url("/models/ants"), { waitUntil: "domcontentloaded" });
    expect(await getStartPaneError(page, 0.3)).toBeLessThanOrEqual(1);
    await page.close();
  });

  // Catches the player starting to load at one width and refitting at another once the page hydrates.
  it("keeps the player pane width from first paint through hydration", async () => {
    const before = await openWithoutScripts();
    await seedSidebarSettings(before, { hidden: false, ratio: 30 });
    await before.goto(url("/models/ants"), { waitUntil: "domcontentloaded" });
    const firstPaint = await getPlayerPaneWidth(before);
    await before.close();

    const after = await openDesktopPage();
    await seedSidebarSettings(after, { hidden: false, ratio: 30 });
    await gotoHydrated(after, url("/models/ants"));
    expect(Math.abs((await getPlayerPaneWidth(after)) - firstPaint)).toBeLessThanOrEqual(1);
    await after.close();
  });

  // Catches the sidebar boot styles undoing student mode, which must hide teaching content before paint.
  it("hides teaching content before hydration in student mode", async () => {
    const page = await openWithoutScripts();
    await page.goto(url("/models/ants?mode=student"), { waitUntil: "domcontentloaded" });
    expect(await page.locator("main [data-teacher-only]").isVisible()).toBe(false);
    await page.close();
  });

  // Catches each refit adding another wrap style to the player, or the scaled player overflowing its pane.
  it("injects the player wrap style once and fits the pane after resizes", async () => {
    const page = await openPlayerPage("/models/ants");
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.setViewportSize(DESKTOP);
    await expect.poll(() => countWrapStyles(page)).toBe(1);
    await expect.poll(() => getStageOverflow(page)).toBe(0);
    await page.close();
  });

  // Catches the skip link missing, out of order, or visible to everyone instead of only on focus.
  it("reaches a skip link right before the player that shows only on focus", async () => {
    const page = await openPlayerPage("/models/ants");
    const link = page.getByRole("link", SKIP_LINK);
    expect((await link.boundingBox())?.width ?? 0).toBeLessThanOrEqual(1);
    expect(await tabTo(page, link)).toBe(true);
    expect((await link.boundingBox())?.width ?? 0).toBeGreaterThan(1);
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("IFRAME");
    await page.close();
  });

  // Catches the skip link leaving focus inside the player, where its code editors trap Tab.
  it.each(["/models/ants", "/models/ants?mode=student"])("moves focus past the player from %s", async (path) => {
    const page = await openPlayerPage(path);
    expect(await tabTo(page, page.getByRole("link", SKIP_LINK))).toBe(true);
    await page.keyboard.press("Enter");
    expect(await getActiveElementId(page)).toBe("player-end");
    await page.close();
  });
});
