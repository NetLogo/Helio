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
          <UInput
            :model-value="store.filters.keyword"
            placeholder="Search models by keyword..."
            icon="i-lucide-search"
            @update:model-value="onKeywordChange"
          />
        </div>
        <UButton
          :variant="store.filters.isEndorsed ? 'solid' : 'outline'"
          icon="i-lucide-award"
          :color="store.filters.isEndorsed ? 'secondary' : 'neutral'"
          size="sm"
          @click="toggleEndorsed"
        >
          Featured
        </UButton>
      </div>

      <div v-if="loadFromEmpty" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <ModelCardSkeleton v-for="i in 6" :key="i" />
      </div>

      <div v-else-if="store.error" class="text-center py-16">
        <UIcon name="i-lucide-wifi-off" class="size-14 text-dimmed mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-toned">Something went wrong</h2>
        <p class="text-muted mt-1">{{ store.error }}</p>
        <UButton variant="outline" class="mt-4" @click="store.fetchModels()"> Try again </UButton>
      </div>

      <div v-else-if="store.isEmpty" class="text-center py-16">
        <UIcon name="i-lucide-inbox" class="size-14 text-dimmed mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-toned">No models found</h2>
        <p class="text-dimmed mt-1">Try adjusting your search or filters.</p>
        <UButton variant="outline" class="mt-4" @click="store.resetFilters()">
          Clear filters
        </UButton>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 relative">
        <ModelCard v-for="model in store.models" :key="model.id" :model="model" />
      </div>

      <div v-if="store.hasMore && !store.loading" class="flex justify-center pt-4">
        <UButton variant="outline" size="lg" @click="store.nextPage()"> Load more </UButton>
      </div>

      <p
        v-if="!store.loading && store.totalCount > 0"
        class="mx-auto text-center text-xs text-dimmed"
      >
        Showing {{ store.models.length }} of {{ store.totalCount }} models
      </p>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import type { SelectMenuItem } from "#ui/types";
import { useModelsStore } from "~/stores/models";

useSeoMeta({
  title: "Explore Models",
  description: "Browse and discover agent-based simulations shared by the NetLogo community.",
  ogTitle: "Explore Models",
  ogDescription: "Browse and discover agent-based simulations shared by the NetLogo community.",
});

const store = useModelsStore();

const indicator = useLoadingIndicator();
const loadFromEmpty = computed(() => !store.models.length && store.loading);

watch(
  () => store.loading,
  (isLoading) => {
    if (isLoading) {
      indicator.start();
    } else {
      indicator.finish();
    }
  },
);

const visibilityOptions: Array<SelectMenuItem> = [
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

function onVisibilityChange(option: SelectMenuItem) {
  store.setFilter("visibility", option.value);
}

function toggleEndorsed() {
  store.setFilter("isEndorsed", store.filters.isEndorsed ? null : true);
}

callOnce("fetchModels", () => store.fetchModels());
</script>
