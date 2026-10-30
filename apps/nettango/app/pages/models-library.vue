<template>
  <UContainer>
    <UPage class="no-stylized-heading">
      <UPageHeader
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
          <NtBlock
            :id="`group-${group.id}`"
            as="h2"
            :color="getTopicColor(group.id)"
            :label="group.title"
            class="w-fit text-lg!"
          />
          <p class="mt-4 mb-6 max-w-2xl text-base font-medium text-toned">{{ group.description }}</p>
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
defineOgImage("SiteSeo", seo);
</script>
