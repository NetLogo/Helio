import { getBrowser, setup, waitForHydration } from "@nuxt/test-utils/e2e";
import type { Browser, Page } from "playwright-core";
import { beforeAll, describe, it, type TestContext } from "vitest";

type SetupOptions = Parameters<typeof setup>[0];

const SETUP_TIMEOUT = Number(process.env["E2E_SETUP_TIMEOUT"] ?? 300_000);

// Tests run against an already running server (dev, or `nuxt preview` of a build), never build inside the test.
export async function e2eSetup(host: string, extra: SetupOptions = {}) {
  return setup({
    browser: true,
    browserOptions: { type: "chromium" },
    setupTimeout: SETUP_TIMEOUT,
    host,
    ...extra,
  });
}

export type SmokeOptions = {
  // Requests that are expected to fail in the environment under test, such as files that only exist on the deployed site.
  allowedFailedRequests?: RegExp[];
  // Console errors the app logs on purpose in that environment, such as a handled fetch failure.
  allowedConsoleErrors?: RegExp[];
};

export function collectPageErrors(page: Page, { allowedFailedRequests = [], allowedConsoleErrors = [] }: SmokeOptions = {}): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    // Failed requests are reported below with their URL, which the generic console line omits.
    const text = msg.text();
    if (msg.type() !== "error" || text.startsWith("Failed to load resource")) return;
    if (!allowedConsoleErrors.some((re) => re.test(text))) errors.push(text);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("response", (res) => {
    if (res.status() >= 400 && !allowedFailedRequests.some((re) => re.test(res.url()))) {
      errors.push(`${res.status()} ${res.url()}`);
    }
  });
  return errors;
}

async function sitemapRoutes(host: string, path = "/sitemap.xml"): Promise<string[]> {
  const xml = await (await fetch(new URL(path, host))).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1] ?? "").pathname);
  if (!xml.includes("<sitemapindex")) return locs;
  const nested = await Promise.all(locs.map((loc) => sitemapRoutes(host, loc)));
  return nested.flat();
}

export async function resolveSmokeRoutes(host: string, curated: string[]): Promise<string[]> {
  if (process.env["SMOKE_ALL_ROUTES"] !== "1") return curated;
  return [...new Set(await sitemapRoutes(host))].sort();
}

// Client-side navigation through the app's own router, without a full page load.
async function navigateClientSide(page: Page, path: string): Promise<void> {
  await page.evaluate(async (target) => {
    // Apps mount on a configurable root id, so find the element that carries the Vue app instead.
    const root = [...document.body.children].find((el) => "__vue_app__" in el) as (Element & { __vue_app__?: any }) | undefined;
    if (!root?.__vue_app__) throw new Error("Vue app not mounted");
    await root.__vue_app__.config.globalProperties.$router.push(target);
  }, path);
}

const firstHeading = (page: Page) => page.locator("h1").first().innerText({ timeout: 15_000 }).then((t) => t.trim());

export async function defineSmokeSuite(host: string, curatedRoutes: string[], options: SmokeOptions = {}) {
  await e2eSetup(host);
  const routes = await resolveSmokeRoutes(host, curatedRoutes);

  // test-utils keeps a single global context that its afterEach clears, so concurrent tests must not call createPage or
  // url while another test finishes: take the browser once and build URLs from the host.
  let browser: Browser;
  beforeAll(async () => {
    browser = await getBrowser();
  });
  const openPage = async ({ onTestFinished }: TestContext, path?: string) => {
    const page = await browser.newPage();
    onTestFinished(() => page.close());
    if (path) {
      await page.goto(new URL(path, host).href);
      await waitForHydration(page, path, "hydration");
    }
    return page;
  };

  // Routes share one browser and run in parallel up to the e2e project's maxConcurrency; every test opens its own pages.
  describe.concurrent.each(routes)("%s", (path) => {
    // Catches pages that fail to render or throw on load (a missing peer dependency, a null article crashing the catch-all).
    it("loads with a 2xx, a title and no console errors", async (ctx) => {
      const { expect } = ctx;
      const page = await openPage(ctx);
      const errors = collectPageErrors(page, options);
      const response = await page.goto(new URL(path, host).href, { waitUntil: "load" });
      expect(response?.status(), `status for ${path}`).toBeLessThan(400);
      expect((await page.title()).trim()).not.toBe("");
      expect(errors).toEqual([]);
    });

    if (path !== "/") {
      // Catches pages that only break when reached through the router (a composable reading the previous route).
      // The server-rendered page is the reference: client-side navigation must end on the same heading, not an error page.
      it("renders the same page after client-side navigation from the home page", async (ctx) => {
        const { expect } = ctx;
        const expected = await firstHeading(await openPage(ctx, path));

        const page = await openPage(ctx, "/");
        const errors = collectPageErrors(page, options);
        await navigateClientSide(page, path);
        // innerText on both sides: textContent drops the line break between block children ("NetLogo\nWeb" vs "NetLogo Web").
        await page.waitForFunction((h) => document.querySelector<HTMLElement>("h1")?.innerText.trim() === h, expected, { timeout: 15_000 });
        expect(new URL(page.url()).pathname.replace(/\/$/, "")).toBe(path.replace(/\/$/, ""));
        expect(errors).toEqual([]);
      });
    }

    // Catches broken head output: keywords merged twice from layered config, og:image routes that fail to render.
    it("has unique keywords and a reachable og:image", async (ctx) => {
      const { expect } = ctx;
      const page = await openPage(ctx, path);
      const keywords = await page.locator('meta[name="keywords"]').evaluateAll((els) =>
        els.map((el) => el.getAttribute("content") ?? ""),
      );
      expect(keywords.length).toBeLessThanOrEqual(1);
      const terms = (keywords[0] ?? "").split(",").map((k) => k.trim()).filter(Boolean);
      expect(terms).toEqual([...new Set(terms)]);

      // evaluateAll does not auto-wait, unlike getAttribute, which stalls for the 30 s default timeout on pages without the tag.
      const [ogImage] = await page.locator('meta[property="og:image"]').evaluateAll((els) => els.map((el) => el.getAttribute("content")));
      if (ogImage) {
        const target = new URL(ogImage, host);
        const res = await page.request.get(new URL(target.pathname + target.search, host).href);
        expect(res.status(), `og:image ${target.pathname}`).toBe(200);
        expect(res.headers()["content-type"]).toMatch(/^image\//);
      }
    });
  });
}
