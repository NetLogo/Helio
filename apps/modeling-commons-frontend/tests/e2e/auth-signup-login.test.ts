// E2E: signup -> verify-email screen -> login (post-verify) -> sign out
//
// Notes for source-side maintainers:
// - The user dropdown trigger in `ClientNavbar.vue` is a plain div with no
//   accessible role/name. Adding `data-testid="user-menu"` and
//   `data-testid="sign-out"` would let this test target the menu without
//   relying on positional locators or class-string hooks.

import { describe, expect, it } from "vitest";
import { createPage, url } from "@nuxt/test-utils/e2e";
import { e2eSetup } from "./setup";
import { buildRandomUser, signUpRandomUser } from "./helpers/auth";

describe("auth: signup + login", async () => {
  await e2eSetup();

  it("signs up a new user and lands on the verify-email page", async () => {
    const page = await createPage();
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    const user = await signUpRandomUser(page);

    expect(page.url()).toContain("/verify-email");
    expect(page.url()).toContain(encodeURIComponent(user.email));
    expect(errors).toEqual([]);

    await page.close();
  });

  it("blocks login for a freshly signed-up but unverified user", async () => {
    const page = await createPage();
    const user = await signUpRandomUser(page);

    await page.goto(url("/login"));
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Log In" }).click();

    // The auth flow either bounces back to /verify-email or surfaces a toast.
    await Promise.race([
      page.waitForURL(/\/verify-email/, { timeout: 15_000 }),
      page
        .getByText(/verify your email|Login failed/i)
        .waitFor({ timeout: 15_000 }),
    ]);

    expect(page.url()).not.toMatch(/\/models\/?$/);
    await page.close();
  });

  it("rejects login with bogus credentials", async () => {
    const page = await createPage();
    await page.goto(url("/login"));

    const fake = buildRandomUser();
    await page.getByLabel("Email").fill(fake.email);
    await page.getByLabel("Password", { exact: true }).fill(fake.password);
    await page.getByRole("button", { name: "Log In" }).click();

    await page
      .getByText(/Login failed|verify your email/i)
      .waitFor({ timeout: 15_000 });

    expect(page.url()).not.toMatch(/\/models\/?$/);
    await page.close();
  });

  it.todo(
    "completes the verification handshake, lands on /models, signs out via navbar, signs back in (needs backend test-token retrieval)",
  );
});
