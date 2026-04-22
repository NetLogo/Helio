<template>
  <div v-if="isLoading" class="passkey-page__loading">
    <UIcon name="i-lucide-loader-circle" class="passkey-page__loading-icon" />
    <p class="passkey-page__loading-copy">Checking your passkey setup...</p>
  </div>

  <div v-else class="passkey-page">
    <AuthPageIntro
      icon="i-lucide-fingerprint"
      title="Use this device next time"
      description="Add a passkey for faster, phishing-resistant sign in with Face ID, Touch ID, or your device PIN."
    />

    <UAlert
      v-if="isPasskeySupportResolved && !isPasskeySupported"
      title="Passkeys aren't available in this browser"
      description="You can keep using email and password on this device."
      icon="i-lucide-monitor-x"
      color="warning"
      variant="subtle"
      :closable="false"
    />

    <UAlert
      v-else
      title="Why add a passkey?"
      description="You'll be able to sign in without typing your password on supported devices."
      icon="i-lucide-shield-check"
      color="neutral"
      variant="subtle"
      :closable="false"
    />

    <div class="passkey-page__actions">
      <UButton
        class="passkey-page__button"
        size="lg"
        :loading="isAddingPasskey"
        :disabled="!isPasskeySupported"
        @click="addPasskey"
      >
        Add a passkey
      </UButton>

      <UButton class="passkey-page__button" color="neutral" variant="ghost" @click="skipForNow">
        Not now
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getSafeNextPath } from "~/utils/auth";

definePageMeta({
  layout: "auth",
  middleware: "auth",
});

useSeoMeta({
  title: "Add a passkey",
  description: "Add a passkey to sign in faster on this device.",
});

const router = useRouter();
const route = useRoute();
const toast = useToast();
const { isPasskeySupported, isPasskeySupportResolved, addPasskey: registerPasskey } = usePasskeys();
const { shouldSkipPrompt, dismissPrompt, clearPromptDismissal, isReady } = usePasskeyPrompt();
const isAddingPasskey = ref(false);
const nextPath = computed(() => getSafeNextPath(route.query.next));
const isLoading = computed(() => !isReady.value);

async function continueToNext() {
  await router.replace(nextPath.value);
}

watch(
  shouldSkipPrompt,
  (shouldSkip) => {
    if (shouldSkip) {
      void continueToNext();
    }
  },
  { immediate: true },
);

async function addPasskey() {
  if (!isPasskeySupported.value || isAddingPasskey.value) {
    return;
  }

  isAddingPasskey.value = true;

  const { error } = await registerPasskey({
    name: "This device",
  });

  isAddingPasskey.value = false;

  if (error) {
    toast.add({
      title:
        error.code === "ERROR_CEREMONY_ABORTED" ? "Passkey setup canceled" : "Passkey setup failed",
      description: error.message ?? "We couldn't add a passkey for this device.",
      icon: "i-lucide-key-round",
      color: error.code === "ERROR_CEREMONY_ABORTED" ? "warning" : "error",
    });
    return;
  }

  clearPromptDismissal();

  toast.add({
    title: "Passkey added",
    description: "You can use this device to sign in next time.",
    icon: "i-lucide-badge-check",
    color: "success",
  });

  await continueToNext();
}

async function skipForNow() {
  dismissPrompt();
  await continueToNext();
}
</script>

<style scoped>
.passkey-page,
.passkey-page__loading {
  display: grid;
  gap: 1.5rem;
}

.passkey-page__loading {
  justify-items: center;
  padding-block: 2rem;
  text-align: center;
}

.passkey-page__loading-icon {
  font-size: 2rem;
  color: var(--ui-color-primary-500);
  animation: spin 1s linear infinite;
}

.passkey-page__loading-copy {
  margin: 0;
  color: var(--ui-text-muted);
}

.passkey-page__actions {
  display: grid;
  gap: 0.75rem;
}

.passkey-page__button {
  justify-content: center;
  width: 100%;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
