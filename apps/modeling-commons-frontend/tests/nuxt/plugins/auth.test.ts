import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

vi.mock("better-auth/vue", () => ({
  createAuthClient: vi.fn(() => ({
    useSession: () => ref({ data: null, isPending: false }),
    getSession: vi.fn(async () => ({ data: null })),
    signIn: { email: vi.fn(), passkey: vi.fn() },
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
    useListPasskeys: vi.fn(() => ref({ data: [], isPending: false, isRefetching: false, refetch: vi.fn() })),
    $fetch: vi.fn(),
  })),
}));

vi.mock("@better-auth/passkey/client", () => ({
  passkeyClient: vi.fn(() => ({})),
}));

vi.mock("better-auth/client/plugins", () => ({
  adminClient: vi.fn(() => ({})),
}));

describe("auth plugin", () => {
  it("provides an $auth object with `client` and `session` shape", async () => {
    const authPlugin = (await import("~/plugins/auth")).default;
    const fakeNuxt = {
      vueApp: {},
      payload: {},
      hook: vi.fn(),
      hooks: { hook: vi.fn() },
      runWithContext: <T,>(fn: () => T) => fn(),
      provide: vi.fn(),
    };

    const pluginDef = authPlugin as unknown as { setup: (n: typeof fakeNuxt) => Promise<{ provide: { auth: unknown } }> };
    const result = await pluginDef.setup(fakeNuxt);

    expect(result.provide).toBeDefined();
    const provided = result.provide as { auth: { client: unknown; session: unknown } };
    expect(provided.auth.client).toBeDefined();
    expect(provided.auth.session).toBeDefined();
  });
});
