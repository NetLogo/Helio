<template>
  <UContainer>
    <UPage class="no-stylized-heading">
      <UPageHeader
        headline="NetTango"
        title="Models Library"
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

const seo = {
  title: "Models Library",
  description:
    "Ready-to-run NetTango models grouped by classroom topic, from ant foraging to force and motion. Run one in the browser or open it in the NetTango Builder.",
};

usePageSeo(seo);
defineOgImageComponent("SiteSeo", seo);
</script>
