<template>
  <UContainer>
    <ModelsListing v-model:search-query="query" :filters="filters">
      <template #header>
        <div class="space-y-2">
          <h4 class="tracking-tight">Featured Models</h4>
          <p class="text-sm text-muted">Community-endorsed simulations from across the library.</p>
        </div>
      </template>
    </ModelsListing>
  </UContainer>
</template>

<script setup lang="ts">
import type { ModelsFilters } from "~/forms/models";

useSeoMeta({
  title: "Featured Models",
  description: "Community-endorsed NetLogo simulations.",
});

const query = useSearchQuery("endorsed-models");
const filters = computed<ModelsFilters>(() => ({ isEndorsed: true, keyword: query.value }));
</script>
