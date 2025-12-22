<template>
  <UPageAside :ui="{ container: 'mt-[var(--block-top)] px-0' }">
    <ArticleRelevantFor :article="article" />
    <ArticleToc :article="article" />
  </UPageAside>
</template>

<script setup lang="ts">
import type { ObjectModel } from '~/data';

type Props = {
  article: ObjectModel.Article;
};

defineProps<Props>();
</script>
