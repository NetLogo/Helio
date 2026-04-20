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

      <template v-else-if="card">
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

        <ModelDetail :card="card" />
      </template>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
const route = useRoute();
const modelId = computed(() => route.params.id as string);

// Where is :versionNumber coming from? It's not in the route params.
// These routes are configured to this page component via custom routing
// /model/:id
// /model/:id/versions/:versionNumber
// /model/:slug/:id
// /model/:slug/:id/versions/:versionNumber
// See nuxt.config.ts for details
// -- Omar Ibrahim, Apr 20 26
const modelVersionNumber = computed(() =>
  route.params.versionNumber ? parseInt(route.params.versionNumber as string) : undefined,
);

const { data: card, error, status, refresh } = useModelCard(modelId);

useSeoMeta({
  title: () => card.value?.latestVersion?.title ?? defaultStrings.modelName,
  description: () => card.value?.latestVersion?.description ?? defaultStrings.modelDescription,
  ogTitle: () => card.value?.latestVersion?.title ?? defaultStrings.modelName,
  ogDescription: () => card.value?.latestVersion?.description ?? defaultStrings.modelDescription,
  ogType: "article",
});

const isLatestVersion = computed(() => {
  if (!card.value) return true;
  const latest = card.value.latestVersion?.versionNumber;
  return !modelVersionNumber.value || latest === modelVersionNumber.value;
});

const latestVersionPath = computed(() => {
  if (!card.value) return null;
  return isLatestVersion.value
    ? `/models/${card.value.model.id}`
    : `/models/${card.value.model.id}/versions/${card.value.latestVersion?.versionNumber}`;
});
</script>
