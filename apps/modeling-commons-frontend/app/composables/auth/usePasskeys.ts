import type { Passkey } from "@better-auth/passkey/client";
import type { RawError } from "better-auth";

interface AddPasskeyInput {
  name?: string;
  authenticatorAttachment?: "platform" | "cross-platform";
}

export default function usePasskeys(options: { withList?: boolean } = {}) {
  const auth = useNuxtApp().$auth;
  const { isPasskeySupported, isPasskeySupportResolved } = usePasskeySupport();
  const listQuery = options.withList ? auth.client.useListPasskeys() : null;

  const passkeys = computed<Passkey[]>(() => [...(listQuery?.value.data ?? [])]);
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

    return response as { error?: { message?: string } };
  }

  async function revokePasskey(id: string) {
    const response = await auth.client.$fetch("/passkey/delete-passkey", {
      method: "POST",
      body: { id },
      throw: false,
    });

    await refreshPasskeys();

    return response as { error?: { message?: string } };
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

export function getPasskeyErrorCode(error: unknown) {
  if (!error) return null;
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return null;
}

export function getPasskeyErrorMessage(error: unknown) {
  if (!error) return null;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: string | RawError | null }).message;
    if (message === null) {
      return null;
    } else if (typeof message === "string") {
      return message;
    } else if (typeof message === "object" && "message" in message) {
      return (message as { message: unknown }).message as string;
    }
  }
  return null;
}
