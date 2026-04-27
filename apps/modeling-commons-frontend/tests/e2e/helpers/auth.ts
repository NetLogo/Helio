import type { Page } from "playwright-core";

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
  await page.goto("/signup");

  await page.getByLabel("Name").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByLabel("Confirm Password").fill(user.password);

  await page.getByRole("button", { name: "Sign Up" }).click();

  await page.waitForURL(/\/verify-email/, { timeout: 30_000 });
  return user;
}

export async function signIn(
  page: Page,
  creds: { email: string; password: string },
): Promise<void> {
  await page.goto("/login");

  await page.getByLabel("Email").fill(creds.email);
  await page.getByLabel("Password", { exact: true }).fill(creds.password);
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
