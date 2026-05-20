import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "app");

const authProtectedPages = [
  "pages/profile/(edit)/settings.vue",
  "pages/profile/drafts/index.vue",
  "pages/models/upload.vue",
];

const guestOnlyPages = ["pages/(auth)/login.vue", "pages/(auth)/signup.vue"];

const PAGE_META_RE = /definePageMeta\(\s*\{([\s\S]*?)\}\s*\)/;
const MIDDLEWARE_RE = /middleware\s*:\s*([\s\S]*?)(?:,|\n\s*\})/;

async function readMiddlewareDecl(rel: string): Promise<string> {
  const src = await readFile(resolve(root, rel), "utf8");
  const meta = src.match(PAGE_META_RE);
  expect(meta, `expected definePageMeta in ${rel}`).toBeTruthy();
  const mw = meta![1]!.match(MIDDLEWARE_RE);
  expect(mw, `expected middleware key in definePageMeta of ${rel}`).toBeTruthy();
  return mw![1]!.trim();
}

describe("page middleware wiring (static guard)", () => {
  for (const rel of authProtectedPages) {
    it(`${rel} declares middleware: 'auth'`, async () => {
      const value = await readMiddlewareDecl(rel);
      expect(value).toMatch(/['"]auth['"]/);
    });
  }

  for (const rel of guestOnlyPages) {
    it(`${rel} declares middleware: 'guest'`, async () => {
      const value = await readMiddlewareDecl(rel);
      expect(value).toMatch(/['"]guest['"]/);
    });
  }
});
