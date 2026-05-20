import { vi } from "vitest";
import { makeAuthState, makeSession, makeUser } from "./fixtures";

type AuthOverrides = {
  loggedIn?: boolean;
  user?: Partial<ReturnType<typeof makeUser>>;
};

export function buildAuthMock({ loggedIn = true, user }: AuthOverrides = {}) {
  const initial = makeAuthState(loggedIn);
  const data = ref(initial.data);

  if (loggedIn && user) {
    data.value = {
      user: { ...makeUser(), ...user },
      session: makeSession(),
    };
  }
  const session = { data };

  const client = {
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
    sendVerificationEmail: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    signOut: vi.fn(),
    changePassword: vi.fn(),
    passkey: {
      addPasskey: vi.fn(),
      deletePasskey: vi.fn(),
      listUserPasskeys: vi.fn(),
    },
  };

  return { session, client };
}

export type AuthMock = ReturnType<typeof buildAuthMock>;
