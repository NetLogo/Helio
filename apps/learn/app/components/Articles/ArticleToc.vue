<template>
  <UContentToc :links="article.item?.body?.toc?.links" />
</template>

<script setup lang="ts">
import type { ObjectModel } from '~/data';

type Props = {
  article: ObjectModel.Article;
};

defineProps<Props>();
</script>
