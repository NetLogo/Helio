<template>
  <UMain>
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
    <article class="docs">
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
</script>
