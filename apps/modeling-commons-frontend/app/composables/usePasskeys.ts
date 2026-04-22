import type { Passkey } from "@better-auth/passkey/client";

interface AddPasskeyInput {
  name?: string;
  authenticatorAttachment?: "platform" | "cross-platform";
}

export default function usePasskeys(options: { withList?: boolean } = {}) {
  const auth = useNuxtApp().$auth;
  const { isPasskeySupported, isPasskeySupportResolved } = usePasskeySupport();
  const listQuery = options.withList ? auth.client.useListPasskeys() : null;

  const passkeys = computed<Passkey[]>(() => listQuery?.value.data ?? []);
  const isPending = computed(() => listQuery?.value.isPending ?? false);
  const isRefetching = computed(() => listQuery?.value.isRefetching ?? false);
  const hasPasskeys = computed(() => passkeys.value.length > 0);
  const passkeyCount = computed(() => passkeys.value.length);
  const passkeyCountLabel = computed(() =>
    passkeyCount.value === 1 ? "1 passkey" : `${passkeyCount.value} passkeys`,
  );

  function signInWithPasskey() {
    return auth.client.signIn.passkey();
  }

  async function addPasskey(input: AddPasskeyInput = {}) {
    const response = await auth.client.passkey.addPasskey({
      name: input.name,
      authenticatorAttachment: input.authenticatorAttachment ?? "platform",
    });

    await refreshPasskeys();

    return response;
  }

  async function renamePasskey(id: string, name: string) {
    const response = await auth.client.$fetch("/passkey/update-passkey", {
      method: "POST",
      body: { id, name },
      throw: false,
    });

    await refreshPasskeys();

    return response;
  }

  async function revokePasskey(id: string) {
    const response = await auth.client.$fetch("/passkey/delete-passkey", {
      method: "POST",
      body: { id },
      throw: false,
    });

    await refreshPasskeys();

    return response;
  }

  async function refreshPasskeys() {
    await listQuery?.value.refetch();
  }

  return {
    isPasskeySupported,
    isPasskeySupportResolved,
    passkeys,
    hasPasskeys,
    passkeyCount,
    passkeyCountLabel,
    isPending,
    isRefetching,
    signInWithPasskey,
    addPasskey,
    renamePasskey,
    revokePasskey,
    refreshPasskeys,
  };
}
