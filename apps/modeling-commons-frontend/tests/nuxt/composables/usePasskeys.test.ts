import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref, type Ref } from "vue";
import usePasskeys from "~/composables/auth/usePasskeys";

type ListValue = {
  data: Array<{ id: string; name: string }>;
  isPending: boolean;
  isRefetching: boolean;
  refetch: () => Promise<void>;
};

const mocks = vi.hoisted(() => ({
  useListPasskeys: vi.fn(),
  addPasskey: vi.fn(async () => ({ ok: true })),
  deletePasskey: vi.fn(async () => ({ ok: true })),
  signInPasskey: vi.fn(async () => ({ ok: true })),
  fetch: vi.fn(async () => ({ ok: true })),
  passkeySupport: vi.fn(),
}));

mockNuxtImport("useNuxtApp", (original) => {
  return (...args: Parameters<typeof useNuxtApp>) => {
    const real = (original as typeof useNuxtApp)(...args);
    return new Proxy(real, {
      get(target, prop) {
        if (prop === "$auth") {
          return {
            client: {
              useListPasskeys: mocks.useListPasskeys,
              passkey: { addPasskey: mocks.addPasskey, deletePasskey: mocks.deletePasskey },
              signIn: { passkey: mocks.signInPasskey },
              $fetch: mocks.fetch,
            },
            session: { value: { data: null } },
          };
        }
        return Reflect.get(target, prop);
      },
    });
  };
});

mockNuxtImport("usePasskeySupport", () => mocks.passkeySupport);

let listRef: Ref<ListValue>;

beforeEach(() => {
  vi.clearAllMocks();
  listRef = ref<ListValue>({
    data: [],
    isPending: false,
    isRefetching: false,
    refetch: vi.fn(async () => undefined),
  });
  mocks.useListPasskeys.mockImplementation(() => listRef);
  mocks.passkeySupport.mockImplementation(() => ({
    isPasskeySupported: ref(true),
    isPasskeySupportResolved: ref(true),
  }));
});

describe("usePasskeys", () => {
  it("exposes an empty list when no passkeys returned", () => {
    const passkeys = usePasskeys({ withList: true });
    expect(passkeys.passkeys.value).toEqual([]);
    expect(passkeys.hasPasskeys.value).toBe(false);
    expect(passkeys.passkeyCount.value).toBe(0);
    expect(passkeys.passkeyCountLabel.value).toBe("0 passkeys");
  });

  it("reflects loaded passkeys and pluralizes the label correctly", () => {
    listRef.value = {
      data: [{ id: "pk-1", name: "Phone" }],
      isPending: false,
      isRefetching: false,
      refetch: vi.fn(async () => undefined),
    };
    const passkeys = usePasskeys({ withList: true });
    expect(passkeys.passkeyCount.value).toBe(1);
    expect(passkeys.passkeyCountLabel.value).toBe("1 passkey");
  });

  it("addPasskey delegates with the chosen attachment", async () => {
    const passkeys = usePasskeys({ withList: true });
    await passkeys.addPasskey({ name: "Phone" });

    expect(mocks.addPasskey).toHaveBeenCalledWith({
      name: "Phone",
      authenticatorAttachment: "platform",
    });
  });

  it("revokePasskey calls $fetch with the delete endpoint", async () => {
    const passkeys = usePasskeys({ withList: true });
    await passkeys.revokePasskey("pk-9");

    expect(mocks.fetch).toHaveBeenCalledWith(
      "/passkey/delete-passkey",
      expect.objectContaining({ method: "POST", body: { id: "pk-9" } }),
    );
  });

  it("signInWithPasskey delegates to auth.client.signIn.passkey", async () => {
    const passkeys = usePasskeys();
    await passkeys.signInWithPasskey();
    expect(mocks.signInPasskey).toHaveBeenCalledTimes(1);
  });
});
