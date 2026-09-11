<template>
  <UContainer>
    <UPage class="no-stylized-heading">
      <UPageHeader
        headline="NetTango"
        title="Models Gallery"
        description="Ready-to-run NetTango environments built with the Builder. Run one in your browser, or download the project file to open and remix it in the NetTango Builder."
      />

      <UPageBody>
        <UPageGrid>
          <ModelCard v-for="model in models" :key="model.id" :model="model" />
        </UPageGrid>
      </UPageBody>
    </UPage>
  </UContainer>
</template>

<script setup lang="ts">
const models = useModels();

definePageMeta({
  layout: "clean",
});

useSeoMeta({
  title: "Model Gallery",
  description:
    "Ready-to-run NetTango environments. Run a model in your browser or download the project file for the NetTango Builder.",
});
</script>
