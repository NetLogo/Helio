<template>
  <UContainer>
    <div class="py-2">
      <UButton
        variant="ghost"
        icon="i-lucide-arrow-left"
        to="/models"
        size="sm"
        class="mb-4 -ml-2 text-muted"
      >
        Back to models
      </UButton>

      <div v-if="status === 'pending'" class="space-y-6 animate-pulse">
        <div class="h-8 w-2/3 bg-accented rounded" />
        <div class="h-4 w-1/3 bg-accented rounded" />
        <div class="h-64 bg-muted rounded-xl" />
        <div class="space-y-2">
          <div class="h-4 bg-accented rounded w-full" />
          <div class="h-4 bg-accented rounded w-5/6" />
          <div class="h-4 bg-accented rounded w-4/6" />
        </div>
      </div>

      <div v-else-if="error" class="rounded-xl border border-error-200 bg-error-50 p-8 text-center">
        <UIcon name="i-lucide-alert-circle" class="size-10 text-error-400 mx-auto mb-3" />
        <p class="text-error-700 font-medium">{{ error.message || "Model not found" }}</p>
        <UButton variant="outline" color="error" class="mt-4" @click="refresh()">
          Try again
        </UButton>
      </div>

      <ModelDetail v-else-if="store.model" />
    </div>
  </UContainer>
</template>

<script setup lang="ts">
const route = useRoute();
const store = useModelDetailStore();
const modelId = computed(() => route.params.id as string);

const { error, status, refresh } = await useAsyncData(
  `model-${modelId.value}`,
  async () => {
    await store.fetchModel(modelId.value);
    if (store.error) {
      throw createError({ statusCode: 404, message: store.error });
    }
    return store.model;
  },
  {
    watch: [modelId],
    getCachedData(key, nuxtApp) {
      return nuxtApp.payload.data[key] || nuxtApp.static.data[key];
    },
  },
);

useSeoMeta({
  title: () => store.currentVersion?.title ?? "Model",
  description: () => store.currentVersion?.description ?? "View model details on Modeling Commons",
  ogTitle: () => store.currentVersion?.title ?? "Model",
  ogDescription: () =>
    store.currentVersion?.description ?? "View model details on Modeling Commons",
  ogType: "article",
});

onUnmounted(() => {
  store.clear();
});
</script>
