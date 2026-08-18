<template>
  <div v-if="isLoading" class="grid justify-items-center gap-6 py-8 text-center">
    <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-primary" />
    <p class="m-0 text-muted">Checking your passkey setup...</p>
  </div>

  <div v-else class="grid gap-6">
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

    <div class="grid gap-3">
      <UButton
        class="w-full justify-center"
        size="lg"
        :loading="isAddingPasskey"
        :disabled="!isPasskeySupported"
        @click="addPasskey"
      >
        Add a passkey
      </UButton>

      <UButton class="w-full justify-center" color="neutral" variant="ghost" @click="skipForNow">
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
  robots: "noindex, nofollow",
});

const route = useRoute();
const toast = useToast();
const { isPasskeySupported, isPasskeySupportResolved, addPasskey: registerPasskey } = usePasskeys();
const { shouldSkipPrompt, dismissPrompt, clearPromptDismissal, isReady } = usePasskeyPrompt();
const isAddingPasskey = ref(false);
const nextPath = computed(() => getSafeNextPath(route.query.next));
const isLoading = computed(() => !isReady.value);

async function continueToNext() {
  await navigateTo(nextPath.value || "/models", { replace: true });
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
        getPasskeyErrorCode(error) === "ERROR_CEREMONY_ABORTED" ? "Passkey setup canceled" : "Passkey setup failed",
      description: getPasskeyErrorMessage(error) ?? "We couldn't add a passkey for this device.",
      icon: "i-lucide-key-round",
      color: getPasskeyErrorCode(error) === "ERROR_CEREMONY_ABORTED" ? "warning" : "error",
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
