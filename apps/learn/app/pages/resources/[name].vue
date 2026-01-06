<template>
  <BookPage v-if="resource.type === 'book'" :resource="resource" />
  <SampleCurriculumPage v-else-if="resource.type === 'sample curriculum'" :resource="resource" />
  <DatasetPage v-else-if="resource.type === 'dataset'" :resource="resource" />
  <SoftwareResourcePage v-else-if="resource.type === 'software resource'" :resource="resource" />
  <ResourcePageBase v-else :resource="resource" />
</template>

<script setup lang="ts">
const route = useRoute();
const nameParam = route.params.name as string;

const resource = await useResource(nameParam);

useSeoMeta({
  title: resource.value.title,
  description: resource.value.description,
  ogTitle: resource.value.title,
  ogDescription: resource.value.description,
  ogType: 'article',
  ogImage: resource.value.thumbnail,
  twitterTitle: resource.value.title,
  twitterDescription: resource.value.description,
  twitterImage: resource.value.thumbnail,
  twitterCard: 'summary_large_image',
});

defineOgImageComponent('DocsSeo', {
  title: resource.value.title,
  description: resource.value.description,
  theme: '#f31500',
  siteLogo: '/turtles.png',
});
</script>
