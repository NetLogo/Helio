<template>
  <UMain v-if="page">
    <UPageHero
      v-if="page && page.has_hero"
      :title="page.title"
      :ui="{
        root: page.hero_class,
      }"
    >
      <template #description>
        <p
          v-for="(paragraph, index) in page.description.split('\n\n')"
          :key="index"
          class="mb-4 text-neutral-lightest"
        >
          {{ paragraph }}
        </p>
      </template>
    </UPageHero>
    <article class="modeling-commons-docs docs">
      <ContentRenderer :value="page!" class="prose" />
    </article>
  </UMain>
</template>

<script lang="ts" setup>
const route = useRoute();

const { data: page } = await useAsyncData(route.path, () => {
  return queryCollection("content").path(route.path).first();
});

if (!page.value) {
  showError({
    statusCode: 404,
    message: "Page Not Found",
  });
}

// Privacy, terms and cookies are real indexable pages; without this they
// inherited only the site-wide title and shipped no description at all.
useSeoMeta({
  title: () => page.value?.title,
  description: () => page.value?.description,
  ogTitle: () => page.value?.title,
  ogDescription: () => page.value?.description,
});
</script>
