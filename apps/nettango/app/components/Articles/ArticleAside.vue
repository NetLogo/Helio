<template>
  <UPageAside :ui="{ container: 'mt-[var(--block-top)] px-0' }">
    <ArticleToc :article="article" />
  </UPageAside>
</template>

<script setup lang="ts">
type Props = {
  article: import('@nuxt/content').ContentCollectionItem;
};

defineProps<Props>();
</script>
