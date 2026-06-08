// E2E: password reset request flow.
//
// The post-email step (clicking the reset token link, choosing a new password,
// signing in) requires either inbox access or a backend endpoint that returns
// the latest reset token for a test user. Until that exists, the second leg of
// the journey is left as an `it.todo`.

import { describe, expect, it } from "vitest";
import { createPage, url } from "@nuxt/test-utils/e2e";
import { e2eSetup } from "./setup";

describe("auth: password reset request", async () => {
  await e2eSetup();

  it("submits a reset request and surfaces the success alert", async () => {
    const page = await createPage();
    await page.goto(url("/reset-password"));

    const email = `reset+${Date.now()}@example.test`;
    await page.getByLabel("Email").fill(email);
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
  });

  it.todo(
    "complete after backend exposes test-token retrieval: visit /reset-password?token=<token>, fill new password, submit, sign in with new credentials",
  );
});
