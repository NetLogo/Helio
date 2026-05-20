import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useAuthResponse from "~/composables/auth/useAuthResponse";

const ERROR_CODES = {
  ACCOUNT_NOT_FOUND: { code: "ACCOUNT_NOT_FOUND" },
  EMAIL_NOT_VERIFIED: { code: "EMAIL_NOT_VERIFIED" },
  BANNED_USER: { code: "BANNED_USER" },
  PASSWORD_ALREADY_SET: { code: "PASSWORD_ALREADY_SET" },
  PASSWORD_TOO_LONG: { code: "PASSWORD_TOO_LONG" },
  PASSWORD_TOO_SHORT: { code: "PASSWORD_TOO_SHORT" },
  INVALID_EMAIL_OR_PASSWORD: { code: "INVALID_EMAIL_OR_PASSWORD" },
  INVALID_PASSWORD: { code: "INVALID_PASSWORD" },
};

mockNuxtImport("useNuxtApp", (original) => {
  return (...args: Parameters<typeof useNuxtApp>) => {
    const real = (original as typeof useNuxtApp)(...args);
    return new Proxy(real, {
      get(target, prop) {
        if (prop === "$auth") {
          return {
            client: { $ERROR_CODES: ERROR_CODES },
            session: { value: null },
          };
        }
        return Reflect.get(target, prop);
      },
    });
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAuthResponse", () => {
  it("is a no-op for falsy results", () => {
    const { handleError } = useAuthResponse();
    expect(() => handleError(undefined)).not.toThrow();
    expect(() => handleError(null)).not.toThrow();
    expect(() => handleError({})).not.toThrow();
    expect(() => handleError({ error: null })).not.toThrow();
  });

  it("throws a friendly message for ACCOUNT_NOT_FOUND", () => {
    const { handleError } = useAuthResponse();
    expect(() => handleError({ error: { code: "ACCOUNT_NOT_FOUND" } })).toThrow(
      /No account found/i,
    );
  });

  it("throws a friendly message for EMAIL_NOT_VERIFIED", () => {
    const { handleError } = useAuthResponse();
    expect(() => handleError({ error: { code: "EMAIL_NOT_VERIFIED" } })).toThrow(
      /not been verified/i,
    );
  });

  it("collapses INVALID_PASSWORD and INVALID_EMAIL_OR_PASSWORD into the same message", () => {
    const { handleError } = useAuthResponse();
    expect(() => handleError({ error: { code: "INVALID_PASSWORD" } })).toThrow(
      /email or password you entered is incorrect/i,
    );
    expect(() => handleError({ error: { code: "INVALID_EMAIL_OR_PASSWORD" } })).toThrow(
      /email or password you entered is incorrect/i,
    );
  });

  it("falls back to the error message for unknown codes", () => {
    const { handleError } = useAuthResponse();
    expect(() =>
      handleError({ error: { code: "SOMETHING_NEW", message: "Backend says no" } }),
    ).toThrow("Backend says no");
  });

  it("falls back to a generic message when no message is provided", () => {
    const { handleError } = useAuthResponse();
    expect(() => handleError({ error: { code: "MYSTERY" } })).toThrow(
      /unexpected error occurred/i,
    );
  });
});
