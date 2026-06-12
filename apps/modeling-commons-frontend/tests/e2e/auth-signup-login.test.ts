// E2E: signup -> verify-email screen -> login (post-verify) -> sign out
//
// Notes for source-side maintainers:
// - The user dropdown trigger in `ClientNavbar.vue` is a plain div with no
//   accessible role/name. Adding `data-testid="user-menu"` and
//   `data-testid="sign-out"` would let this test target the menu without
//   relying on positional locators or class-string hooks.

import { describe, expect, it } from "vitest";
import { createPage } from "@nuxt/test-utils/e2e";
import { e2eSetup } from "./setup";
import { buildRandomUser, signUpRandomUser } from "./helpers/auth";
import { fillField } from "./helpers/form";
import { gotoHydrated } from "./helpers/nav";
import { dumpOnFailure } from "./helpers/debug";

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
    // Vue Router doesn't percent-encode `+`/`@` in query values, so compare the
    // decoded `email` param rather than assuming a specific URL encoding.
    expect(new URL(page.url()).searchParams.get("email")).toBe(user.email);
    expect(errors).toEqual([]);

    await page.close();
  });

  it("blocks login for a freshly signed-up but unverified user", async () => {
    const label = "unverified-login";
    const page = await createPage();
    try {
      const user = await signUpRandomUser(page);

      await gotoHydrated(page, "/login");
      await fillField(page.getByLabel("Email"), user.email);
      await fillField(page.getByLabel("Password", { exact: true }), user.password);

      // Assert the backend rejects the unverified login, then that the client
      // bounces to the verify-email screen rather than logging in.
      const signIn = page.waitForResponse((r) => r.url().includes("/sign-in/email"), {
        timeout: 30_000,
      });
      await page.getByRole("button", { name: "Log In" }).click();
      const response = await signIn;

      expect(response.ok()).toBe(false);
      await page.waitForURL(/\/verify-email/, { timeout: 30_000 });
      expect(page.url()).not.toMatch(/\/models\/?$/);
      await page.close();
    } catch (err) {
      await dumpOnFailure(page, label, err);
    }
  });

  it("rejects login with bogus credentials", async () => {
    const label = "bogus-login";
    const page = await createPage();
    try {
      await gotoHydrated(page, "/login");

      const fake = buildRandomUser();
      await fillField(page.getByLabel("Email"), fake.email);
      await fillField(page.getByLabel("Password", { exact: true }), fake.password);

      const signIn = page.waitForResponse((r) => r.url().includes("/sign-in/email"), {
        timeout: 30_000,
      });
      await page.getByRole("button", { name: "Log In" }).click();
      const response = await signIn;

      expect(response.ok()).toBe(false);
      expect(page.url()).not.toMatch(/\/models\/?$/);
      await page.close();
    } catch (err) {
      await dumpOnFailure(page, label, err);
    }
  });

  it.todo(
    "completes the verification handshake, lands on /models, signs out via navbar, signs back in (needs backend test-token retrieval)",
  );
});
