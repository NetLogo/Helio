import type { Page } from "playwright-core";
import { fillField } from "./form";
import { gotoHydrated } from "./nav";
import { extractLink, waitForMessageTo } from "./mailpit";

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
  // The navbar renders a desktop and a mobile user-menu trigger (one hidden by
  // responsive CSS), so pick the visible one. Reka can swallow a click that
  // lands before it's interactive, so retry click + keyboard below.
  const trigger = page.locator("#main-navbar [aria-haspopup='menu']:visible").first();
  await trigger.waitFor({ state: "visible", timeout: 30_000 });

  const signOut = page.getByRole("menuitem", { name: /Sign out/i });
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await signOut.isVisible().catch(() => false)) break;
    await trigger.click().catch(() => undefined);
    if (await signOut.isVisible().catch(() => false)) break;
    await trigger.focus().catch(() => undefined);
    await page.keyboard.press("Enter").catch(() => undefined);
    await page.waitForTimeout(400);
  }
  await signOut.click();

  // Sign-out clears the session; the navbar returns to its logged-out state.
  await page
    .locator("#main-navbar a[href='/signup']:visible")
    .first()
    .waitFor({ state: "visible", timeout: 15_000 });
}

export async function completeOnboardingViaUi(page: Page): Promise<void> {
  await page.waitForURL((u) => /\/(onboarding|models)/.test(u.pathname), { timeout: 30_000 });
  if (!page.url().includes("/onboarding")) {
    return;
  }
  // We reached /onboarding via client-side redirects, so the reactive session
  // ref the page reads (`$auth.session`) is empty and "Get started" would throw
  // before writing. Load /onboarding fresh so SSR hydrates the session first.
  await gotoHydrated(page, "/onboarding");
  // "Get started" persists `onboardedAt` via PATCH, but the client session
  // refresh is fire-and-forget, so an in-SPA navigation can race it and loop
  // back to /onboarding. Wait for the write, then do a fresh hydrated load so
  // SSR re-resolves the (now onboarded) session from the cookie.
  const patched = page.waitForResponse(
    (r) => /\/api\/v1\/users\//.test(r.url()) && r.request().method() === "PATCH",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: /Get started/i }).click();
  await patched;
  await gotoHydrated(page, "/models");
  await page.waitForURL((u) => !u.pathname.startsWith("/onboarding"), { timeout: 30_000 });
}

// Drives the full verification handshake: signup emits a real verification
// email (captured by Mailpit), following its link verifies + auto-signs-in
// (Better Auth `autoSignInAfterVerification`), and onboarding is completed via
// the UI. Returns a verified, onboarded, signed-in user.
export async function signUpAndVerify(page: Page): Promise<SignedUpUser> {
  const user = await signUpRandomUser(page);
  const id = await waitForMessageTo(user.email);
  const link = await extractLink(
    id,
    /https?:\/\/[^\s"'<>]*\/api\/auth\/verify-email\?[^\s"'<>]+/,
  );
  await page.goto(link);
  await completeOnboardingViaUi(page);
  return user;
}
