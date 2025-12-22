<template>
  <ResourcePageBase :resource="resource" image-label="cover" long-description-title="About This Book" />
</template>

<script setup lang="ts">
import type { ResourcesCollectionItem } from '@nuxt/content';

type Props = {
  resource: ResourcesCollectionItem;
};

defineProps<Props>();
</script>
