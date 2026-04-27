import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import useAuthActions from "~/composables/useAuthActions";
import {
  getEmailVerificationCallbackUrl,
  getResetPasswordRedirectUrl,
} from "~/utils/auth";
import { buildAuthMock } from "~~/tests/helpers/mockUser";

const { authMock } = vi.hoisted(() => ({
  authMock: { current: null as ReturnType<typeof buildAuthMock> | null },
}));

mockNuxtImport("useNuxtApp", (original) => {
  return (...args: Parameters<typeof useNuxtApp>) => {
    const real = (original as typeof useNuxtApp)(...args);
    return new Proxy(real, {
      get(target, prop) {
        if (prop === "$auth") {
          return {
            get client() {
              return authMock.current?.client ?? ({} as ReturnType<typeof buildAuthMock>["client"]);
            },
            get session() {
              return authMock.current?.session ?? { value: null };
            },
          };
        }
        return Reflect.get(target, prop);
      },
    });
  };
});

let APP_URL: string;

beforeEach(() => {
  vi.resetAllMocks();
  authMock.current = buildAuthMock({ loggedIn: false });
  APP_URL = useRuntimeConfig().public.appUrl as string;
});

describe("useAuthActions", () => {
  it("signInWithEmail forwards credentials and the verification callback URL", async () => {
    const actions = useAuthActions();
    await actions.signInWithEmail({ email: "a@b.com", password: "pw", next: "/profile" });

    expect(authMock.current!.client.signIn.email).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "pw",
      callbackURL: getEmailVerificationCallbackUrl(APP_URL, "/profile"),
    });
  });

  it("signUpWithEmail forwards profile fields and callback URL", async () => {
    const actions = useAuthActions();
    await actions.signUpWithEmail({
      email: "a@b.com",
      name: "Ada",
      password: "pw",
      userKind: "student",
      next: "/welcome",
    });

    expect(authMock.current!.client.signUp.email).toHaveBeenCalledWith({
      email: "a@b.com",
      name: "Ada",
      password: "pw",
      userKind: "student",
      callbackURL: getEmailVerificationCallbackUrl(APP_URL, "/welcome"),
    });
  });

  it("sendVerificationEmail forwards the email and callback URL", async () => {
    const actions = useAuthActions();
    await actions.sendVerificationEmail({ email: "a@b.com", next: "/done" });

    expect(authMock.current!.client.sendVerificationEmail).toHaveBeenCalledWith({
      email: "a@b.com",
      callbackURL: getEmailVerificationCallbackUrl(APP_URL, "/done"),
    });
  });

  it("requestPasswordReset uses the reset-password redirect", async () => {
    const actions = useAuthActions();
    await actions.requestPasswordReset({ email: "a@b.com" });

    expect(authMock.current!.client.requestPasswordReset).toHaveBeenCalledWith({
      email: "a@b.com",
      redirectTo: getResetPasswordRedirectUrl(APP_URL),
    });
  });

  it("resetPassword forwards token + newPassword", async () => {
    const actions = useAuthActions();
    await actions.resetPassword({ token: "tok", newPassword: "newpw" });

    expect(authMock.current!.client.resetPassword).toHaveBeenCalledWith({
      token: "tok",
      newPassword: "newpw",
    });
  });

  it("signOut delegates to the auth client", async () => {
    const actions = useAuthActions();
    await actions.signOut();
    expect(authMock.current!.client.signOut).toHaveBeenCalledTimes(1);
  });
});
