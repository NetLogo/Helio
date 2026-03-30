<template>
  <UContainer>
    <div class="space-y-8">
      <header class="space-y-2">
        <h1 class="text-3xl font-bold text-slate-900 tracking-tight font-display">
          Explore Models
        </h1>
        <p class="text-slate-500">
          Browse and discover agent-based simulations shared by the community.
        </p>
      </header>

      <!-- Search & Filters -->
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <UInput
            :model-value="store.filters.keyword"
            placeholder="Search models by keyword..."
            icon="i-lucide-search"
            size="lg"
            @update:model-value="onKeywordChange"
          />
        </div>
        <USelectMenu
          :items="visibilityOptions"
          :model-value="selectedVisibility"
          placeholder="Visibility"
          class="w-40"
          @update:model-value="onVisibilityChange"
        />
        <UButton
          :variant="store.filters.isEndorsed ? 'solid' : 'outline'"
          icon="i-lucide-award"
          :color="store.filters.isEndorsed ? 'warning' : 'neutral'"
          @click="toggleEndorsed"
        >
          Featured
        </UButton>
      </div>

      <div v-if="store.loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <ModelCardSkeleton v-for="i in 6" :key="i" />
      </div>

      <!-- Empty State -->
      <div v-else-if="store.isEmpty" class="text-center py-16">
        <UIcon name="i-lucide-inbox" class="size-14 text-slate-300 mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-slate-600">No models found</h2>
        <p class="text-slate-400 mt-1">Try adjusting your search or filters.</p>
        <UButton variant="outline" class="mt-4" @click="store.resetFilters()">
          Clear filters
        </UButton>
      </div>

      <!-- Model Cards Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <ModelCard v-for="model in store.models" :key="model.id" :model="model" />
      </div>

      <!-- Pagination -->
      <div v-if="store.hasMore && !store.loading" class="flex justify-center pt-4">
        <UButton variant="outline" size="lg" @click="store.nextPage()"> Load more </UButton>
      </div>

      <!-- Count -->
      <p v-if="!store.loading && store.totalCount > 0" class="mx-auto text-center text-xs text-slate-400">
        Showing {{ store.models.length }} of {{ store.totalCount }} models
      </p>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import { useModelsStore } from "~/stores/models";

useSeoMeta({
  title: "Explore Models",
  description: "Browse agent-based simulations shared by the community",
});

const store = useModelsStore();

const visibilityOptions = [
  { label: "All", value: null },
  { label: "Public", value: "public" },
  { label: "Private", value: "private" },
  { label: "Unlisted", value: "unlisted" },
] as const;

const selectedVisibility = computed(
  () => visibilityOptions.find((o) => o.value === store.filters.visibility) ?? visibilityOptions[0],
);

let keywordTimeout: ReturnType<typeof setTimeout>;
function onKeywordChange(value: string | number) {
  clearTimeout(keywordTimeout);
  keywordTimeout = setTimeout(() => {
    store.setFilter("keyword", String(value));
  }, 300);
}

function onVisibilityChange(option: { value: string | null }) {
  store.setFilter("visibility", option.value as any);
}

function toggleEndorsed() {
  store.setFilter("isEndorsed", store.filters.isEndorsed ? null : true);
}

onMounted(() => {
  if (store.models.length === 0) {
    store.fetchModels();
  }
});
</script>
