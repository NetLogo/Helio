<template>
  <div class="grid gap-6">
    <AuthPageIntro :icon="intro.icon" :title="intro.title" :description="intro.description" />

    <UButton
      v-if="canSubmit"
      class="w-full justify-center"
      size="lg"
      :loading="status === 'submitting'"
      @click="unsubscribe"
    >
      {{
        status === "failed"
          ? notificationUnsubscribeLiterals.retryButton
          : notificationUnsubscribeLiterals.confirmButton
      }}
    </UButton>

    <UButton class="w-full justify-center" variant="ghost" to="/settings/notifications">
      {{ notificationUnsubscribeLiterals.settingsLink }}
    </UButton>
  </div>
</template>

<script setup lang="ts">

definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: notificationUnsubscribeLiterals.seoTitle,
  description: notificationUnsubscribeLiterals.seoDescription,
  robots: "noindex, nofollow",
});

const route = useRoute();
const token = computed(() => (typeof route.query.token === "string" ? route.query.token : ""));

const { status, unsubscribe } = useNotificationUnsubscribe(token);

const intro = computed(() => {
  if (status.value === "done" || status.value === "invalid" || status.value === "failed") {
    return notificationUnsubscribeLiterals.intros[status.value];
  }
  return notificationUnsubscribeLiterals.intros.confirm;
});
const canSubmit = computed(() => status.value !== "done" && status.value !== "invalid");
</script>
