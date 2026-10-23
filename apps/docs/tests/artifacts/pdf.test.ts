import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import * as mupdf from "mupdf";
import { beforeAll, describe, expect, it } from "vitest";

// Run after `yarn docs:build-and-generate-manual`. Paths can be overridden for CI layouts.
const version = /^PRODUCT_VERSION="?([^"\n]+)"?/m.exec(readFileSync(".env", "utf8"))?.[1] ?? "";
const PDF_PATH = process.env["DOCS_PDF"] ?? ".build/NetLogo_User_Manual.pdf";
const HTML_DIR = process.env["DOCS_BUILD_DIR"] ?? `.build/${version}`;

type OutlineItem = { title?: string; page?: number; down?: OutlineItem[] };

// The chapter list is whatever pdf-content says, so the test follows changes to the manual's contents.
function manualChapters(): string[] {
  const out = execFileSync("bash", ["-c", 'source scripts/generate-manual/pdf-content >/dev/null; printf "%s\\n" "${files[@]}"'], {
    encoding: "utf8",
  });
  return out.split("\n").filter((f) => f && f !== "title");
}

function chapterTitle(file: string): string {
  const html = readFileSync(`${HTML_DIR}/${file}.html`, "utf8");
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? "";
  return h1.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;|&#x27;/g, "'").replace(/\s+/g, " ").trim();
}

const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

describe("PDF manual", () => {
  let doc: mupdf.Document;
  let chapters: { file: string; title: string }[];
  let tocText: string;
  let outlineTop: string[];

  beforeAll(() => {
    expect(existsSync(PDF_PATH), `${PDF_PATH} missing: run yarn docs:build-and-generate-manual first`).toBe(true);
    doc = mupdf.Document.openDocument(readFileSync(PDF_PATH), "application/pdf");
    chapters = manualChapters().map((file) => ({ file, title: chapterTitle(file) }));
    const outline = (doc.loadOutline() ?? []) as OutlineItem[];
    outlineTop = outline.map((o) => normalize(o.title ?? ""));
    // The outline gives the table of contents page range: from its own bookmark to the next one.
    const tocIndex = outlineTop.indexOf("Table of Contents");
    const start = outline[tocIndex]?.page ?? 1;
    const end = outline[tocIndex + 1]?.page ?? start + 1;
    const pages: string[] = [];
    for (let i = start; i < end; i++) pages.push(doc.loadPage(i).toStructuredText().asText());
    tocText = normalize(pages.join(" "));
  });

  // Catches an empty or truncated artifact (a renderer failure that still writes a file).
  it("is a substantial PDF with a page per chapter at least", () => {
    expect(statSync(PDF_PATH).size).toBeGreaterThan(1_000_000);
    expect(doc.countPages()).toBeGreaterThan(chapters.length);
  });

  // Catches a stale or mislabeled artifact: the title page must carry the version being built.
  it("opens with the title page for this version", () => {
    expect(normalize(doc.loadPage(0).toStructuredText().asText())).toContain(`NetLogo ${version} User Manual`);
  });

  // Catches chapters dropped from the generated table of contents.
  it("lists every chapter in the table of contents", () => {
    expect(tocText).toContain("Table of Contents");
    const missing = chapters.filter((c) => !tocText.includes(c.title)).map((c) => c.file);
    expect(missing).toEqual([]);
  });

  // Catches chapters missing from the PDF bookmarks, which readers use to navigate.
  it("has a top-level bookmark for every chapter", () => {
    const missing = chapters.filter((c) => !outlineTop.includes(c.title)).map((c) => `${c.file} (${c.title})`);
    expect(missing).toEqual([]);
  });

  // Catches the same chapter being bundled twice.
  it("includes each chapter once", () => {
    const counts = new Map<string, number>();
    for (const title of outlineTop) counts.set(title, (counts.get(title) ?? 0) + 1);
    expect([...counts].filter(([, n]) => n > 1).map(([t]) => t)).toEqual([]);
  });
});
