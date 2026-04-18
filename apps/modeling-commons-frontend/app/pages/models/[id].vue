<template>
  <UContainer>
    <div class="space-y-4">
      <UButton
        variant="ghost"
        icon="i-lucide-arrow-left"
        to="/models"
        size="sm"
        class="-ml-2 text-muted"
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

      <template v-else-if="store.model">
        <UAlert
          v-if="!isLatestVersion"
          variant="subtle"
          :closable="false"
          icon="i-lucide-history"
          title="You are viewing an older version of this model"
          orientation="horizontal"
          :actions="[
            {
              label: 'View Latest',
              to: latestVersionPath!,
              trailingIcon: 'i-lucide-arrow-right',
              variant: 'link',
            },
          ]"
        />

        <ModelDetail />
      </template>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
const route = useRoute();
const store = useModelDetailStore();
const modelId = computed(() => route.params.id as string);
// Where is this coming from? I don't see it in the route params.
// Check (nuxt.config.ts).hooks['pages:extend'] to see how the routes are being generated.
const modelVersionNumber = computed(
  () => parseInt(route.params.versionNumber as string) ?? undefined,
);

const api = useApi();

const { error, status, refresh } = await useAsyncData(
  `model-${modelId.value}-${modelVersionNumber.value ?? "latest"}`,
  async () => {
    await store.fetchModel(modelId.value);
    if (modelVersionNumber.value) {
      await store.selectVersion(modelVersionNumber.value);
    }
    if (store.error) {
      throw createError({ statusCode: 404, message: store.error });
    }
    return store.model;
  },
  {
    watch: [modelId, modelVersionNumber],
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

const isLatestVersion = computed(() => {
  return store.model?.latestVersionNumber === store.currentVersion?.versionNumber;
});
const latestVersionPath = computed(() => {
  if (!store.model) return null;
  if (isLatestVersion.value) {
    return `/models/${store.model.id}`;
  } else {
    return `/models/${store.model.id}/versions/${store.model.latestVersionNumber}`;
  }
});

onUnmounted(() => {
  store.clear();
});
</script>
