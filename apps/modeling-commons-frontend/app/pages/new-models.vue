<template>
  <UContainer>
    <ModelsListing :filters="filters">
      <template #header>
        <SectionHeader
          title="New Models"
          subtitle="The latest NetLogo models uploaded by the community."
          heading="h4"
        />
      </template>
    </ModelsListing>
  </UContainer>
</template>

<script setup lang="ts">
import type { ModelsFilters } from "~/features/models/types";

useSeoMeta({
  title: "New Models",
  description: "The latest NetLogo models uploaded by the community.",
});

const filters = computed<ModelsFilters>(() => ({ sortBy: "recent", order: "desc" }));
</script>
