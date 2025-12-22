<template>
  <ResourceCard :resource="resource" :show-metadata="showMetadata" />
</template>

<script setup lang="ts">
import type { ResourcesCollectionItem } from '@nuxt/content';

type Props = {
  resource: ResourcesCollectionItem;
  showMetadata?: boolean;
};

withDefaults(defineProps<Props>(), {
  showMetadata: true,
});
</script>
