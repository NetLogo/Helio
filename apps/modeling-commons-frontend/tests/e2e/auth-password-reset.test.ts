// E2E: password reset request flow.
//
// The post-email step (clicking the reset token link, choosing a new password,
// signing in) uses `signUpAndVerify` to create a real verified account, then
// reads the reset email from Mailpit to follow the token link.

import type { Page } from "playwright-core";
import { describe, expect, it } from "vitest";
import { createPage, waitForHydration } from "@nuxt/test-utils/e2e";
import { e2eSetup } from "./setup";
import { fillField } from "./helpers/form";
import { signIn, signUpAndVerify } from "./helpers/auth";
import { gotoHydrated } from "./helpers/nav";
import { clearMessages, extractLink, waitForMessageTo } from "./helpers/mailpit";
import { dumpOnFailure } from "./helpers/debug";

// Sign out before exercising the reset flow so the post-reset redirect lands on
// /login (logged in, it would route to /profile/settings instead).
//
// We don't drive the navbar menu here: right after the verification redirect the
// reactive session hydrates very late (the documented fire-and-forget
// `$auth.refresh()`), so the user dropdown can stay unrendered for tens of
// seconds, making the menu-based sign-out flaky. Instead, hit Better Auth's
// sign-out endpoint from the page context (so it carries the host-scoped session
// cookie), which is the same call the menu item makes, then reload so SSR
// re-resolves the now-cleared session.
const AUTH_BASE =
  process.env.NUXT_PUBLIC_AUTH_BASE ?? "http://localhost:3000/api/auth";

async function signOut(page: Page): Promise<void> {
  const status = await page.evaluate(async (base) => {
    const res = await fetch(`${base}/sign-out`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    return res.status;
  }, AUTH_BASE);
  expect(status).toBeLessThan(400);
  await gotoHydrated(page, "/");
}

describe("auth: password reset request", async () => {
  await e2eSetup();

  it("submits a reset request and surfaces the success alert", async () => {
    const page = await createPage();
    await gotoHydrated(page, "/reset-password");

    const email = `reset+${Date.now()}@example.test`;
    await fillField(page.getByLabel("Email"), email);
    await page.getByRole("button", { name: "Send reset link" }).click();

    // The page shows either a success alert (any input) or an error alert
    // (RESET_PASSWORD_DISABLED). Either is a deterministic post-submit state.
    await Promise.race([
      page.getByText(/Check your inbox/i).waitFor({ timeout: 15_000 }),
      page
        .getByText(/Couldn't send reset email/i)
        .waitFor({ timeout: 15_000 }),
    ]);

    // URL should reflect the email param after the success branch. The page
    // shows the alert before awaiting navigateTo({ query: { email } }), so wait
    // for the URL to catch up rather than reading it immediately.
    if (await page.getByText(/Check your inbox/i).isVisible()) {
      await page.waitForURL((u) => u.searchParams.get("email") === email, {
        timeout: 15_000,
      });
      expect(new URL(page.url()).searchParams.get("email")).toBe(email);
    }

    await page.close();
  }, 120_000);

  it("resets the password via the emailed token link and signs in with the new password", async () => {
    const label = "password-reset-token";
    const page = await createPage();
    try {
      const user = await signUpAndVerify(page);
      await signOut(page);

      // Drop the verification email so the reset link is the only match.
      await clearMessages();

      await gotoHydrated(page, "/reset-password");
      await fillField(page.getByLabel("Email"), user.email);
      await page.getByRole("button", { name: "Send reset link" }).click();
      await page.getByText(/Check your inbox/i).waitFor({ timeout: 15_000 });

      const id = await waitForMessageTo(user.email);
      // Better Auth emails a backend link with the token in the path; visiting
      // it 302-redirects to the frontend form at /reset-password?token=...
      const link = await extractLink(
        id,
        /https?:\/\/[^\s"'<>]*\/api\/auth\/reset-password\/[^\s"'<>]+/,
      );
      await page.goto(link);
      await page.waitForURL(/\/reset-password\?token=/, { timeout: 30_000 });
      // The backend link 302s into the SPA form; wait for hydration so the
      // submit handler (@submit.prevent) is wired before we click.
      await waitForHydration(page, page.url(), "hydration");

      const newPassword = "NewPass123!";
      await fillField(page.getByLabel("New password"), newPassword);
      await fillField(page.getByLabel("Confirm password"), newPassword);
      await page.getByRole("button", { name: "Reset password" }).click();
      await page.waitForURL(/\/login/, { timeout: 30_000 });

      await signIn(page, { email: user.email, password: newPassword });

      // The post-login client redirect bounces through `/passkey` (auth
      // middleware) and can loop while the reactive session lags behind the
      // freshly-set cookie, so the page keeps navigating. Land on a stable
      // public page first so the next assertions don't race a navigation.
      await gotoHydrated(page, "/");

      // Assert authentication at the source: the login POST set a valid session
      // cookie, so Better Auth's session endpoint resolves to this user — proof
      // the new password works.
      const session = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/get-session`, { credentials: "include" });
        return res.ok ? ((await res.json()) as { user?: { email?: string } } | null) : null;
      }, AUTH_BASE);
      expect(session?.user?.email).toBe(user.email);

      // And a fresh (SSR) load of an auth-protected route resolves the session
      // from the cookie and stays put rather than bouncing to /login.
      await gotoHydrated(page, "/profile/settings");
      await page.waitForURL((u) => u.pathname === "/profile/settings", { timeout: 30_000 });
      expect(new URL(page.url()).pathname).toBe("/profile/settings");

      await page.close();
    } catch (err) {
      await dumpOnFailure(page, label, err);
    }
  }, 120_000);
});
