<template>
  <UContainer>
    <div class="space-y-4">
      <ModelDetailSkeleton v-if="status === 'pending'" />

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
const t = ref(false); // for testing reactivity of nested components, can be removed later

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
