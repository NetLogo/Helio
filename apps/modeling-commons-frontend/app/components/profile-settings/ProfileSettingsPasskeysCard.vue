<template>
  <ProfileSettingsCard
    eyebrow="Security"
    title="Passkeys"
    description="Use your device biometrics or PIN instead of typing a password."
  >
    <template #header>
      <UBadge color="neutral" variant="subtle" size="sm">
        {{ passkeyCountLabel }}
      </UBadge>
    </template>

    <UAlert
      v-if="isPasskeySupportResolved && !isPasskeySupported"
      title="Passkeys aren't available in this browser"
      description="You can still rename or revoke existing passkeys here, but adding a new one requires a compatible browser and secure context."
      color="warning"
      variant="subtle"
      icon="i-lucide-monitor-x"
      :closable="false"
    />

    <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <UFormField label="New passkey name">
        <UInput v-model="newPasskeyName" placeholder="This device" icon="i-lucide-fingerprint" />
      </UFormField>

      <UButton
        color="primary"
        :loading="isAddingPasskey"
        :disabled="!isPasskeySupported || !newPasskeyName.trim()"
        @click="createPasskey"
      >
        Add passkey
      </UButton>
    </div>

    <div
      v-if="isPending || isRefetching"
      class="grid justify-items-center gap-3 rounded-md bg-neutral-darkest/5 p-6 text-center"
    >
      <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-primary" />
      <p class="m-0 text-sm text-muted">Loading your registered passkeys…</p>
    </div>

    <div
      v-else-if="!passkeys.length"
      class="grid justify-items-center gap-3 rounded-md bg-neutral-darkest/5 p-6 text-center"
    >
      <UIcon name="i-lucide-key-round" class="text-3xl text-primary" />
      <div class="grid gap-1.5">
        <p class="m-0 font-medium text-highlighted">No passkeys yet</p>
        <p class="m-0 text-sm text-muted">
          Add one now to make future sign-ins faster and more resilient.
        </p>
      </div>
    </div>

    <ul v-else class="grid list-none gap-4 p-0">
      <li
        v-for="passkey in passkeys"
        :key="passkey.id"
        class="grid gap-4 rounded-md border border-neutral-darkest/10 bg-neutral-darkest/5 p-4"
      >
        <div class="grid gap-1.5">
          <p class="m-0 font-medium text-highlighted">
            {{ passkey.name || "Unnamed passkey" }}
          </p>
          <p class="m-0 text-sm text-muted">
            Added {{ formatDate(String(passkey.createdAt)) }}
            <span v-if="passkey.deviceType"> • {{ sentenceCase(passkey.deviceType) }}</span>
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <UFormField label="Passkey name" class="min-w-0">
            <UInput
              :model-value="draftName(passkey)"
              placeholder="Passkey name"
              @update:model-value="updateDraftName(passkey.id, String($event ?? ''))"
            />
          </UFormField>

          <div class="flex flex-wrap gap-3">
            <UButton
              color="neutral"
              variant="outline"
              :loading="renamingId === passkey.id"
              :disabled="!canRename(passkey)"
              @click="rename(passkey)"
            >
              Save
            </UButton>
            <UButton
              color="error"
              variant="ghost"
              :loading="revokingId === passkey.id"
              @click="revoke(passkey)"
            >
              Revoke
            </UButton>
          </div>
        </div>
      </li>
    </ul>
  </ProfileSettingsCard>
</template>

<script setup lang="ts">
import type { Passkey } from "@better-auth/passkey/client";

const toast = useToast();
const {
  isPasskeySupported,
  isPasskeySupportResolved,
  passkeys,
  passkeyCountLabel,
  isPending,
  isRefetching,
  addPasskey,
  renamePasskey,
  revokePasskey,
} = usePasskeys({ withList: true });

const newPasskeyName = ref("This device");
const draftNames = ref<Record<string, string>>({});
const isAddingPasskey = ref(false);
const renamingId = ref<string | null>(null);
const revokingId = ref<string | null>(null);

watch(
  passkeys,
  (currentPasskeys) => {
    const nextDrafts: Record<string, string> = {};

    for (const passkey of currentPasskeys) {
      nextDrafts[passkey.id] = draftNames.value[passkey.id] ?? passkey.name ?? "";
    }

    draftNames.value = nextDrafts;
  },
  { immediate: true },
);

function draftName(passkey: Passkey) {
  return draftNames.value[passkey.id] ?? passkey.name ?? "";
}

function updateDraftName(id: string, value: string) {
  draftNames.value = {
    ...draftNames.value,
    [id]: value,
  };
}

function canRename(passkey: Passkey) {
  const nextName = draftName(passkey).trim();
  return Boolean(nextName && nextName !== (passkey.name ?? ""));
}

async function createPasskey() {
  if (!isPasskeySupported.value || isAddingPasskey.value) {
    return;
  }

  isAddingPasskey.value = true;

  const { error } = await addPasskey({
    name: newPasskeyName.value.trim(),
  });

  isAddingPasskey.value = false;

  if (error) {
    toast.add({
      title:
        error.code === "ERROR_CEREMONY_ABORTED" ? "Passkey setup canceled" : "Passkey setup failed",
      description: error.message ?? "We couldn't add a passkey for this device.",
      icon: "i-lucide-fingerprint",
      color: error.code === "ERROR_CEREMONY_ABORTED" ? "warning" : "error",
    });
    return;
  }

  toast.add({
    title: "Passkey added",
    description: "This device can now be used to sign in faster.",
    icon: "i-lucide-badge-check",
    color: "success",
  });
}

async function rename(passkey: Passkey) {
  if (!canRename(passkey) || renamingId.value) {
    return;
  }

  renamingId.value = passkey.id;
  const response = await renamePasskey(passkey.id, draftName(passkey).trim());
  renamingId.value = null;

  if (response.error) {
    toast.add({
      title: "Couldn't rename passkey",
      description: response.error.message ?? "Please try again.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
    return;
  }

  toast.add({
    title: "Passkey updated",
    description: "The new passkey name has been saved.",
    icon: "i-lucide-badge-check",
    color: "success",
  });
}

async function revoke(passkey: Passkey) {
  if (revokingId.value) {
    return;
  }

  revokingId.value = passkey.id;
  const response = await revokePasskey(passkey.id);
  revokingId.value = null;

  if (response.error) {
    toast.add({
      title: "Couldn't revoke passkey",
      description: response.error.message ?? "Please try again.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
    return;
  }

  toast.add({
    title: "Passkey revoked",
    description: "That device can no longer be used to sign in with a passkey.",
    icon: "i-lucide-badge-check",
    color: "success",
  });
}
</script>
