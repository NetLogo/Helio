import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useUser, { isLoggedIn } from "~/composables/user/useUser";
import { makeUser } from "~~/tests/helpers/fixtures";
import { buildAuthMock } from "~~/tests/helpers/mockUser";

const { authMock } = vi.hoisted(() => {
  return { authMock: { current: null as ReturnType<typeof buildAuthMock> | null } };
});

mockNuxtImport("useNuxtApp", (original) => {
  return (...args: Parameters<typeof useNuxtApp>) => {
    const real = (original as typeof useNuxtApp)(...args);
    return new Proxy(real, {
      get(target, prop) {
        if (prop === "$auth") {
          return {
            get session() {
              return authMock.current?.session ?? { value: null };
            },
            get client() {
              return authMock.current?.client ?? {};
            },
          };
        }
        return Reflect.get(target, prop);
      },
    });
  };
});

authMock.current = buildAuthMock({ loggedIn: true });

beforeEach(() => {
  vi.resetAllMocks();
  authMock.current = buildAuthMock({ loggedIn: true });
});

describe("useUser", () => {
  it("surfaces user fields and isLoggedIn=true when authenticated", () => {
    const sample = makeUser({ id: "u-42", name: "Grace Hopper", email: "grace@example.com" });
    authMock.current = buildAuthMock({ loggedIn: true, user: sample });

    const user = useUser();

    expect(user.value.isLoggedIn).toBe(true);
    if (!user.value.isLoggedIn) throw new Error("expected logged in");
    expect(user.value.id).toBe("u-42");
    expect(user.value.name).toBe("Grace Hopper");
    expect(user.value.email).toBe("grace@example.com");
    expect(user.value.user.id).toBe("u-42");
    expect(user.value.session).toBeTruthy();
  });

  it("returns the signed-out shape when no session data", () => {
    authMock.current = buildAuthMock({ loggedIn: false });

    const user = useUser();

    expect(user.value.isLoggedIn).toBe(false);
    expect(user.value.user).toBeNull();
    expect(user.value.session).toBeNull();
  });
});

describe("isLoggedIn type guard", () => {
  it("returns true for authenticated state", () => {
    authMock.current = buildAuthMock({ loggedIn: true });
    const user = useUser();
    expect(isLoggedIn(user.value)).toBe(true);
  });

  it("returns false for the signed-out state", () => {
    authMock.current = buildAuthMock({ loggedIn: false });
    const user = useUser();
    expect(isLoggedIn(user.value)).toBe(false);
  });
});
