<template>
  <UContainer>
    <div class="space-y-8">
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

      <div v-if="error" class="text-center py-16">
        <UIcon name="i-lucide-wifi-off" class="size-14 text-dimmed mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-toned">Something went wrong</h2>
        <p class="text-muted mt-1">{{ error.message }}</p>
        <UButton variant="outline" class="mt-4" @click="refresh()"> Try again </UButton>
      </div>

      <div v-else class="flex flex-col gap-8 relative">
        <ModelTable
          :ref="table"
          :key="instanceKey"
          :models="rows"
          :loading="pending"
          :class="{
            'pointer-events-none opacity-50': pending,
          }"
          :can-load-more="hasMore"
          @reset-filters="resetFilters()"
          @on-load-more="nextPage()"
        />
      </div>

      <p v-if="totalCount > 0" class="mx-auto text-center text-xs text-dimmed">
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

const table = ref();

const {
  rows,
  totalCount,
  filters,
  pending,
  error,
  hasMore,
  instanceKey,
  refresh,
  setFilter,
  nextPage,
  resetFilters,
} = useModels();

const indicator = useLoadingIndicator();
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
