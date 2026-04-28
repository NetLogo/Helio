<template>
  <UContainer>
    <div class="space-y-8">
      <UPageHero
        title="Explore Models"
        description="Browse and discover agent-based simulations shared by the community."
        :ui="{
          container: 'lg:p-25',
        }"
      />

      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <SearchBar
            :model-value="filters.keyword"
            autofocus
            @update:model-value="onKeywordChange"
          />
        </div>
        <UButton
          :variant="filters.isEndorsed ? 'solid' : 'outline'"
          icon="i-lucide-award"
          :color="filters.isEndorsed ? 'secondary' : 'neutral'"
          size="sm"
          @click="toggleEndorsed"
        >
          Featured
        </UButton>
      </div>

      <div v-if="loadFromEmpty" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <ModelCardSkeleton v-for="i in 6" :key="i" />
      </div>

      <div v-else-if="error" class="text-center py-16">
        <UIcon name="i-lucide-wifi-off" class="size-14 text-dimmed mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-toned">Something went wrong</h2>
        <p class="text-muted mt-1">{{ error.message }}</p>
        <UButton variant="outline" class="mt-4" @click="refresh()"> Try again </UButton>
      </div>

      <div v-else-if="isEmpty" class="text-center py-16">
        <UIcon name="i-lucide-inbox" class="size-14 text-dimmed mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-toned">No models found</h2>
        <p class="text-dimmed mt-1">Try adjusting your search or filters.</p>
        <UButton variant="outline" class="mt-4" @click="resetFilters()"> Clear filters </UButton>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
        <ModelCard v-for="card in rows" :key="card.model.id" :card="card" />
      </div>

      <div v-if="hasMore && !pending" class="flex justify-center pt-4">
        <UButton variant="outline" size="lg" @click="nextPage()"> Load more </UButton>
      </div>

      <p v-if="!pending && totalCount > 0" class="mx-auto text-center text-xs text-dimmed">
        Showing {{ rows.length }} of {{ totalCount }} models
      </p>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
useSeoMeta({
  title: "Explore Models",
  description: "Browse and discover agent-based simulations shared by the NetLogo community.",
  ogTitle: "Explore Models",
  ogDescription: "Browse and discover agent-based simulations shared by the NetLogo community.",
});

const {
  rows,
  totalCount,
  filters,
  pending,
  error,
  hasMore,
  isEmpty,
  refresh,
  setFilter,
  nextPage,
  resetFilters,
} = useModels();

const indicator = useLoadingIndicator();
const loadFromEmpty = computed(() => !rows.value.length && pending.value);

watch(pending, (isLoading) => {
  if (isLoading) indicator.start();
  else indicator.finish();
});

let keywordTimeout: ReturnType<typeof setTimeout>;
function onKeywordChange(value: string | number) {
  clearTimeout(keywordTimeout);
  keywordTimeout = setTimeout(() => {
    void setFilter("keyword", String(value));
  }, 300);
}

function toggleEndorsed() {
  void setFilter("isEndorsed", filters.value.isEndorsed ? null : true);
}
</script>
