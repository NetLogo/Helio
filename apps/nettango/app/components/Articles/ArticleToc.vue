<template>
  <UContentToc :links="article.body?.toc?.links" />
</template>

<script setup lang="ts">
import type { ContentCollectionItem } from '@nuxt/content';

type Props = {
  article: ContentCollectionItem;
};

defineProps<Props>();
</script>
