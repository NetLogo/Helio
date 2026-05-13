<template>
  <div class="space-y-8">
    <slot name="header" />

    <div class="flex gap-2 w-full flex-1">
      <SearchBar v-if="props.showSearch" v-model="searchQuery" placeholder="Search models..." />
      <ModelCardsOrientationSelect v-model="orientation" class="justify-end" />
    </div>

    <ModelCards
      :cards="rows"
      :loading="pending"
      :can-load-more="hasMore"
      :orientation="orientation"
      :class="{ 'pointer-events-none opacity-50': pending }"
      :error="error ?? undefined"
      @on-load-more="nextPage()"
      @retry="refresh"
    />

    <p v-if="totalCount > 0" class="mx-auto text-center text-xs text-dimmed">
      Showing {{ rows.length }} of {{ totalCount }} models
    </p>
  </div>
</template>

<script setup lang="ts">
import type { ModelsFilters } from "~/forms/models";

const props = withDefaults(defineProps<{ filters: ModelsFilters; showSearch?: boolean }>(), {
  showSearch: false,
});

const searchQuery = defineModel("searchQuery", {
  type: String,
  default: "",
});

const filters = computed(() => props.filters);

const orientation = ref<"horizontal" | "vertical">("horizontal");

const { rows, totalCount, pending, error, hasMore, refresh, nextPage } = useModels({ filters });

defineExpose({ totalCount });

const indicator = useLoadingIndicator();
watch(pending, (isLoading) => {
  if (isLoading) indicator.start();
  else indicator.finish();
});
</script>
