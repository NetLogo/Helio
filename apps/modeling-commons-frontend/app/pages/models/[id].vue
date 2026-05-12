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

      <ModelError v-else-if="error" :title="error.message || undefined" @retry="refresh()" />

      <template v-else-if="displayCard">
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

        <ModelDetail :card="displayCard" />
      </template>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import type { ModelCard } from "~/composables/model/useModelCard";

const route = useRoute();
const modelId = computed(() => route.params.id as string);

// Routes mapping to this page (see nuxt.config.ts):
// /models/:id
// /models/:id/versions/:versionNumber
// /models/:slug/:id
// /models/:slug/:id/versions/:versionNumber
const modelVersionNumber = computed(() =>
  route.params.versionNumber ? parseInt(route.params.versionNumber as string) : undefined,
);

const { data: card, error, status, refresh } = useModelCard(modelId);

const { data: versionCard } = useModelVersionCard(
  modelId,
  computed(() => modelVersionNumber.value ?? 0),
);

const displayCard = computed<ModelCard | null>(() => {
  if (!card.value) return null;
  if (!modelVersionNumber.value || !versionCard.value) return card.value;
  const v = versionCard.value;
  return {
    ...card.value,
    latestVersion: {
      ...v.version,
      netlogoFileDownloadUrl: v.netlogoFileDownloadUrl,
      previewImageUrl: v.previewImageUrl,
    },
    tagsOnLatestVersion: v.tags,
    previewImageUrl: v.previewImageUrl,
  };
});

useSeoMeta({
  title: () => displayCard.value?.latestVersion?.title ?? defaultStrings.modelName,
  description: () =>
    displayCard.value?.latestVersion?.description ?? defaultStrings.modelDescription,
  ogTitle: () => displayCard.value?.latestVersion?.title ?? defaultStrings.modelName,
  ogDescription: () =>
    displayCard.value?.latestVersion?.description ?? defaultStrings.modelDescription,
  ogType: "article",
});

const isLatestVersion = computed(() => {
  if (!card.value) return true;
  const latest = card.value.latestVersion?.versionNumber;
  return !modelVersionNumber.value || latest === modelVersionNumber.value;
});

const latestVersionPath = computed(() => {
  if (!card.value) return null;
  return `/models/${card.value.model.id}`;
});
</script>
