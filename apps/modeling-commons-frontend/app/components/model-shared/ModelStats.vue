<template>
  <div class="flex items-center gap-3 text-sm text-toned">
    <StatView
      v-if="likes !== undefined"
      icon="i-lucide-thumbs-up"
      :count="likes"
      :as-text="asText"
      label="like"
    />
    <StatView
      v-if="downloads !== undefined"
      icon="i-lucide-download"
      :count="downloads"
      :as-text="asText"
      label="download"
    />
    <StatView
      v-if="views !== undefined"
      icon="i-lucide-eye"
      :count="views"
      :as-text="asText"
      label="view"
    />
    <StatView
      v-if="runs !== undefined"
      icon="i-lucide-play"
      :count="runs"
      :as-text="asText"
      label="run"
    />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    likes?: number;
    downloads?: number;
    views?: number;
    runs?: number;
    asText?: boolean;
  }>(),
  {
    asText: false,
    likes: undefined,
    downloads: undefined,
    views: undefined,
    runs: undefined,
  },
);
</script>
