import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

// Run after `DOCS_ENV_STATIC=1 yarn nuxt:generate` (the offline, file:// bundle).
const OUT = process.env["DOCS_OUTPUT_DIR"] ?? ".output/public";

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".html"))
    .map((f) => join(dir, f));
}

describe("static (offline) docs build", () => {
  let pages: { file: string; html: string }[];

  beforeAll(() => {
    expect(existsSync(OUT), `${OUT} missing: run DOCS_ENV_STATIC=1 yarn nuxt:generate first`).toBe(true);
    // Guard against testing the normal build by mistake: the static build strips scripts and extracts the UI colors.
    expect(existsSync(join(OUT, "_nuxt/ui-colors.css")), `${OUT} is not a static build`).toBe(true);
    pages = htmlFiles(OUT).map((file) => ({ file, html: readFileSync(file, "utf8") }));
  });

  // Catches links that only work on a web server: under file:// a leading slash points at the filesystem root.
  it("has no root-absolute src or href", () => {
    const offenders = pages
      .flatMap(({ file, html }) => [...html.matchAll(/\b(?:src|href)="(\/(?!\/)[^"]*)"/g)].map((m) => `${relative(OUT, file)}: ${m[1]}`))
      .slice(0, 20);
    expect(offenders).toEqual([]);
  });

  // Catches the $CDN placeholder leaking into output when the rewrite hook misses an attribute.
  it("has no unresolved $CDN placeholders", () => {
    expect(pages.filter(({ html }) => html.includes("$CDN")).map(({ file }) => relative(OUT, file))).toEqual([]);
  });

  // Catches broken offline navigation: every relative link to a page must resolve to a file next to it.
  // The offline bundle leaves out the extension catalog pages (<ext>/dictionary) on purpose, so links to them are expected.
  it("has no relative page links that point at missing files", () => {
    const broken: string[] = [];
    for (const { file, html } of pages) {
      for (const m of html.matchAll(/\bhref="((?!https?:|mailto:|#|\/\/)[^"#?]+\.html)/g)) {
        if (/(^|\/)[^/]+\/dictionary\.html$/.test(m[1] ?? "")) continue;
        const target = join(dirname(file), m[1] ?? "");
        if (!existsSync(target)) broken.push(`${relative(OUT, file)} -> ${m[1]}`);
      }
    }
    expect(broken.slice(0, 20)).toEqual([]);
  });

  // Catches the offline bundle shipping JavaScript or the content database, which it is configured to drop.
  it("ships no scripts or content database", () => {
    const scripts = readdirSync(join(OUT, "_nuxt")).filter((f) => f.endsWith(".js"));
    expect(scripts).toEqual([]);
    expect(existsSync(join(OUT, "__nuxt_content"))).toBe(false);
  });
});
