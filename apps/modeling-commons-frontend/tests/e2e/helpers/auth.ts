import type { Page } from "playwright-core";
import { fillField } from "./form";
import { gotoHydrated } from "./nav";

export interface SignedUpUser {
  email: string;
  password: string;
  name: string;
}

const PASSWORD = "Test12345!";

export function buildRandomUser(): SignedUpUser {
  const stamp = Date.now();
  return {
    email: `e2e+${stamp}@example.test`,
    password: PASSWORD,
    name: `E2E User ${stamp}`,
  };
}

export async function signUpRandomUser(page: Page): Promise<SignedUpUser> {
  const user = buildRandomUser();
  await gotoHydrated(page, "/signup");

  await fillField(page.getByLabel("Name"), user.name);
  await fillField(page.getByLabel("Email"), user.email);
  await fillField(page.getByLabel("Password", { exact: true }), user.password);
  await fillField(page.getByLabel("Confirm Password"), user.password);

  await page.getByRole("button", { name: "Sign Up" }).click();

  await page.waitForURL(/\/verify-email/, { timeout: 30_000 });
  return user;
}

export async function signIn(
  page: Page,
  creds: { email: string; password: string },
): Promise<void> {
  await gotoHydrated(page, "/login");

  await fillField(page.getByLabel("Email"), creds.email);
  await fillField(page.getByLabel("Password", { exact: true }), creds.password);
  await page.getByRole("button", { name: "Log In" }).click();

  await page.waitForURL(/\/(models|passkey|profile)/, { timeout: 30_000 });
}

export async function signOutViaNavbar(page: Page): Promise<void> {
  await page.locator("#main-navbar").getByRole("img").first().click().catch(() => undefined);
  const menuButton = page.locator("#main-navbar [class*='hover:cursor-pointer']").first();
  await menuButton.click();
  await page.getByRole("menuitem", { name: /Sign out/i }).click();
  await page.waitForURL(/\/$/, { timeout: 15_000 });
}
