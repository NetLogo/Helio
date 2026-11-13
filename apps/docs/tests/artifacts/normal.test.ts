import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

// Run after `yarn nuxt:generate` (the regular hosted site).
const OUT = process.env["DOCS_OUTPUT_DIR"] ?? ".output/public";
const KEY_PAGES = ["index.html", "matrix.html", "dictionary.html", "programming.html"];

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".html"))
    .map((f) => join(dir, f));
}

describe("docs build", () => {
  let pages: { file: string; html: string }[];

  beforeAll(() => {
    expect(existsSync(OUT), `${OUT} missing: run yarn nuxt:generate first`).toBe(true);
    // Guard against testing the static build by mistake, which strips all scripts.
    expect(readdirSync(join(OUT, "_nuxt")).some((f) => f.endsWith(".js")), `${OUT} looks like a static build`).toBe(true);
    pages = htmlFiles(OUT).map((file) => ({ file, html: readFileSync(file, "utf8") }));
  });

  // Catches prerendering that silently drops pages (a crawl that stops early, a route that fails to render).
  it("prerenders the key pages and the sitemap", () => {
    for (const page of KEY_PAGES) expect(existsSync(join(OUT, page)), page).toBe(true);
    expect(existsSync(join(OUT, "sitemap.xml"))).toBe(true);
    expect(pages.length).toBeGreaterThan(100);
  });

  // Catches keywords duplicated by layered runtime config, on any page.
  it("emits at most one keywords meta per page, without repeated keywords", () => {
    const bad = pages.flatMap(({ file, html }) => {
      const metas = [...html.matchAll(/<meta name="keywords" content="([^"]*)"/g)].map((m) => m[1] ?? "");
      const terms = (metas[0] ?? "").split(",").map((k) => k.trim()).filter(Boolean);
      return metas.length > 1 || new Set(terms).size !== terms.length ? [relative(OUT, file)] : [];
    });
    expect(bad.slice(0, 20)).toEqual([]);
  });

  // Catches og:image references that point at images the build never rendered.
  it("renders the og:image each key page references", () => {
    for (const page of KEY_PAGES) {
      const html = readFileSync(join(OUT, page), "utf8");
      const og = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1];
      expect(og, `og:image on ${page}`).toBeTruthy();
      const file = join(OUT, new URL(og!).pathname);
      expect(existsSync(file), `${page} -> ${new URL(og!).pathname}`).toBe(true);
      // JPEG files start with FF D8, PNG with 89 50.
      const magic = readFileSync(file).subarray(0, 2).toString("hex");
      expect(["ffd8", "8950"]).toContain(magic);
    }
  });
});
