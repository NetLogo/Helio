<template>
  <UContainer>
    <UPage class="no-stylized-heading">
      <UPageHeader
        headline="NetTango"
        title="Models Gallery"
        description="Ready-to-run NetTango environments built with the Builder. Run one in your browser, or download the project file to open and remix it in the NetTango Builder."
      />

      <UPageBody class="mt-10">
        <section
          v-for="group in groups"
          :key="group.id"
          :aria-labelledby="`group-${group.id}`"
          class="mb-12 last:mb-0"
        >
          <h2 :id="`group-${group.id}`" class="text-2xl font-semibold text-highlighted">
            {{ group.title }}
          </h2>
          <p class="mt-1 mb-6 text-sm text-muted">{{ group.description }}</p>
          <UPageGrid class="mt-8">
            <ModelCard v-for="model in group.models" :key="model.id" :model="model" show-curation />
          </UPageGrid>
        </section>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

<script setup lang="ts">
const groups = useModelGroups();

definePageMeta({
  layout: "clean",
});

useSeoMeta({
  title: "Model Gallery",
  description:
    "Ready-to-run NetTango environments. Run a model in your browser or download the project file for the NetTango Builder.",
});
</script>
