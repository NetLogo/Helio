<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="-translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-full opacity-0"
  >
    <div
      v-if="isOffline"
      role="status"
      aria-live="polite"
      class="sticky top-0 z-50 w-full bg-error text-inverted shadow"
    >
      <div class="max-w-500 mx-auto flex items-center gap-3 px-4 py-2 text-sm">
        <UIcon name="i-lucide-wifi-off" class="size-4 shrink-0" />
        <span class="flex-1">
          We're unable to reach the server. Please check your connection and try again.
        </span>
        <UButton
          size="xs"
          color="neutral"
          variant="subtle"
          icon="i-lucide-refresh-cw"
          :loading="checking"
          @click="retry"
        >
          Retry
        </UButton>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const { isOffline, checkNow } = useConnectionHealth();
const toast = useToast();
const checking = ref(false);

async function retry() {
  checking.value = true;
  try {
    await checkNow();
  } finally {
    checking.value = false;
  }
}

watch(isOffline, (offline, wasOffline) => {
  if (wasOffline && !offline) {
    refreshNuxtData();
    toast.add({
      title: "Connection restored",
      icon: "i-lucide-wifi",
    });
  }
});
</script>
