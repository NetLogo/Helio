import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Page } from "playwright-core";

// Failure-only net for the e2e auth tests: on a thrown assertion, capture a
// screenshot + HTML so CI artifacts show the page state at the moment of
// failure. No-op on green runs.
const ARTIFACT_DIR = process.env.E2E_ARTIFACT_DIR ?? join(process.cwd(), "tests/e2e/.artifacts");

export async function dumpOnFailure(page: Page, label: string, err: unknown): Promise<never> {
  try {
    await mkdir(ARTIFACT_DIR, { recursive: true });
    const shot = join(ARTIFACT_DIR, `${label}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    await writeFile(join(ARTIFACT_DIR, `${label}.html`), await page.content());
    console.log(`[e2e:${label}] FAILURE url=${page.url()} :: saved ${shot}`);
  } catch (dumpErr) {
    console.log(`[e2e:${label}] dump failed: ${(dumpErr as Error).message}`);
  }
  throw err;
}
