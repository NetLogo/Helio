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

    <div class="profile-passkeys-card__create">
      <UFormField label="New passkey name">
        <UInput
          v-model="newPasskeyName"
          placeholder="This device"
          icon="i-lucide-fingerprint"
        />
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

    <div v-if="isPending || isRefetching" class="profile-passkeys-card__loading">
      <UIcon name="i-lucide-loader-circle" class="profile-passkeys-card__loading-icon" />
      <p class="profile-passkeys-card__loading-copy">Loading your registered passkeys…</p>
    </div>

    <div v-else-if="!passkeys.length" class="profile-passkeys-card__empty">
      <UIcon name="i-lucide-key-round" class="profile-passkeys-card__empty-icon" />
      <div class="profile-passkeys-card__empty-copy">
        <p class="profile-passkeys-card__empty-title">No passkeys yet</p>
        <p class="profile-passkeys-card__empty-description">
          Add one now to make future sign-ins faster and more resilient.
        </p>
      </div>
    </div>

    <ul v-else class="profile-passkeys-card__list">
      <li v-for="passkey in passkeys" :key="passkey.id" class="profile-passkeys-card__item">
        <div class="profile-passkeys-card__item-summary">
          <p class="profile-passkeys-card__item-title">
            {{ passkey.name || "Unnamed passkey" }}
          </p>
          <p class="profile-passkeys-card__item-meta">
            Added {{ formatDate(String(passkey.createdAt)) }}
            <span v-if="passkey.deviceType"> • {{ sentenceCase(passkey.deviceType) }}</span>
          </p>
        </div>

        <div class="profile-passkeys-card__item-actions">
          <UFormField label="Passkey name" class="profile-passkeys-card__rename-field">
            <UInput
              :model-value="draftName(passkey)"
              placeholder="Passkey name"
              @update:model-value="updateDraftName(passkey.id, String($event ?? ''))"
            />
          </UFormField>

          <div class="profile-passkeys-card__buttons">
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

<style scoped>
.profile-passkeys-card__create {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: end;
}

.profile-passkeys-card__loading,
.profile-passkeys-card__empty {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--ui-bg-muted) 65%, transparent);
  text-align: center;
}

.profile-passkeys-card__loading-icon,
.profile-passkeys-card__empty-icon {
  font-size: 2rem;
  color: var(--ui-color-primary-500);
}

.profile-passkeys-card__loading-icon {
  animation: spin 1s linear infinite;
}

.profile-passkeys-card__loading-copy,
.profile-passkeys-card__empty-title,
.profile-passkeys-card__empty-description {
  margin: 0;
}

.profile-passkeys-card__empty-copy {
  display: grid;
  gap: 0.35rem;
}

.profile-passkeys-card__empty-title {
  color: var(--ui-text-highlighted);
  font-weight: 500;
}

.profile-passkeys-card__empty-description,
.profile-passkeys-card__loading-copy {
  color: var(--ui-text-muted);
  font-size: 0.9375rem;
}

.profile-passkeys-card__list {
  display: grid;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.profile-passkeys-card__item {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid color-mix(in srgb, var(--ui-border) 80%, transparent);
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--ui-bg-muted) 65%, transparent);
}

.profile-passkeys-card__item-summary {
  display: grid;
  gap: 0.35rem;
}

.profile-passkeys-card__item-title,
.profile-passkeys-card__item-meta {
  margin: 0;
}

.profile-passkeys-card__item-title {
  color: var(--ui-text-highlighted);
  font-weight: 500;
}

.profile-passkeys-card__item-meta {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}

.profile-passkeys-card__item-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: end;
}

.profile-passkeys-card__rename-field {
  min-width: 0;
}

.profile-passkeys-card__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .profile-passkeys-card__create,
  .profile-passkeys-card__item-actions {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
