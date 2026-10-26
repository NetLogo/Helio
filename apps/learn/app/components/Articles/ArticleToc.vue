<template>
  <UContentToc :links="article.item?.body?.toc?.links" :ui="{ container: 'lg:pt-4', trigger: 'mt-0' }" />
</template>

<script setup lang="ts">
import type { ObjectModel } from '~/data';

type Props = {
  article: ObjectModel.Article;
};

defineProps<Props>();
</script>
