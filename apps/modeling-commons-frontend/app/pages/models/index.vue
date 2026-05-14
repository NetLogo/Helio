<template>
  <UContainer>
    <div class="space-y-8">
      <div class="space-y-2">
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="relative flex-1">
            <SearchBar
              :model-value="filters.keyword"
              autofocus
              @update:model-value="onKeywordChange"
            />
          </div>

          <!-- @extract -->
          <USlideover ref="slideover" :ui="{ content: 'space-y-2 lg:min-w-120' }">
            <UButton
              icon="i-lucide-sliders-horizontal"
              size="sm"
              :class="{ 'pulse-shadow': highlightFlags.slideover }"
            >
              Filter and Sort
            </UButton>

            <template #content>
              <div class="flex justify-between items-center border-0">
                <h5>Filter & Sort</h5>
                <UButton variant="link" size="xs" @click="resetFilters()"> Clear All </UButton>
              </div>

              <div class="space-y-8 mt-2 border-0">
                <div class="flex flex-col gap-3">
                  <div class="flex items-center gap-2 justify-between">
                    <span class="text-start wrap-break-word text-md font-medium py-1">Sort by</span>
                    <!-- @extract -->
                    <UButton
                      variant="soft"
                      size="xs"
                      @click="
                        filters.order === 'asc'
                          ? setFilter('order', 'desc')
                          : setFilter('order', 'asc')
                      "
                    >
                      <UIcon :name="modelOrderIcons[filters.order ?? 'desc']" class="size-4" />
                    </UButton>
                  </div>
                  <URadioGroup
                    v-model="filters.sortBy"
                    variant="card"
                    default-value="recent"
                    :items="modelSortByOptions"
                    @update:model-value="setModelSortBy"
                  />
                </div>

                <div class="flex flex-col gap-3">
                  <span class="text-start wrap-break-word text-md font-medium py-1"
                    >Types of Models</span
                  >
                  <div class="flex gap-4 flex-wrap">
                    <!-- @extract -->
                    <UButton
                      v-for="{ key, label, onClick, active } in modelTypeButtons"
                      :key="key"
                      :variant="active ? 'solid' : 'outline'"
                      color="neutral"
                      size="xs"
                      @click="onClick"
                      >{{ label }}</UButton
                    >
                  </div>
                </div>

                <div class="flex flex-col gap-3">
                  <span class="text-start wrap-break-word text-md font-medium py-1"
                    >Publish Date</span
                  >
                  <div>
                    <div class="flex gap-6 w-full">
                      <UFormField label="From" class="w-full">
                        <UInput
                          type="date"
                          label="From"
                          :value="filters.fromDate"
                          @update:model-value="(v) => setDateRange(v as string, 'fromDate')"
                        />
                      </UFormField>
                      <UFormField label="To" class="w-full">
                        <UInput
                          type="date"
                          label="To"
                          :value="filters.toDate"
                          @update:model-value="(v) => setDateRange(v as string, 'toDate')"
                        />
                      </UFormField>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </USlideover>
        </div>

        <div class="flex gap-3">
          <UserSelectMenu
            v-model="author.selected"
            v-model:search-term="author.searchTerm"
            :users="author.users"
            :load-next-page="author.loadNextPage"
            :can-load-more="author.canLoadMore"
            :loading="author.pending"
            class="flex-1 lg:min-w-80"
            :class="{ 'pulse-shadow': highlightFlags.author }"
          />
          <TagSelectMenu
            v-model="tags.selected"
            v-model:search-term="tags.searchTerm"
            :tags="tags.tags"
            :load-next-page="tags.loadNextPage"
            :can-load-more="tags.canLoadMore"
            :loading="tags.pending"
            class="flex-1 lg:min-w-80"
            :class="{ 'pulse-shadow': highlightFlags.tags }"
          />
          <NetLogoVersionSelectMenu
            v-model="version.selected"
            v-model:search-term="version.searchTerm"
            :versions="version.versions"
            :loading="version.pending"
            class="flex-1 lg:min-w-60"
            :class="{ 'pulse-shadow': highlightFlags.version }"
          />
        </div>
      </div>

      <ModelCardsOrientationSelect v-model="orientation" class="justify-end" />

      <ModelCards
        :key="instanceKey"
        :cards="rows"
        :models="rows"
        :loading="pending"
        :can-load-more="hasMore"
        :orientation="orientation"
        :class="{
          'pointer-events-none opacity-50': pending,
        }"
        :error="error"
        @reset-filters="resetFilters()"
        @on-load-more="nextPage()"
        @retry="refresh"
      />

      <p v-if="totalCount > 0" class="mx-auto text-center text-xs text-dimmed">
        Showing {{ rows.length }} of {{ totalCount }} models
      </p>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import {
  modelKeywordDebounceMs,
  modelOrderIcons,
  modelsIndexSeoMeta,
  modelSortByOptions,
  modelTypeFilterOptions,
} from "~/forms/models";

useSeoMeta(modelsIndexSeoMeta);

const orientation = ref<"horizontal" | "vertical">("horizontal");

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
  setDateRange,
  nextPage,
  resetFilters,
} = useModelsSearchController();

const route = useRoute();
// @extract
const highlightFlags = ref({
  author: Boolean(route.query.authorId),
  tags: Boolean(route.query.tag),
  version: Boolean(route.query.netlogoVersion),
  keyword: Boolean(route.query.keyword),
  slideover: Boolean(
    route.query.sortBy ||
      route.query.order ||
      route.query.modelType ||
      route.query.fromDate ||
      route.query.toDate,
  ),
});

const author = reactive(useUserFilter(filters, setFilter));
const tags = reactive(useTagsFilter(filters, setFilter));
const version = reactive(useNetlogoVersionsFilter(filters, setFilter));

const setModelSortBy = (value: string) => {
  setFilter("sortBy", value as ModelSortBy);
};

const modelTypeButtons = computed(() =>
  modelTypeFilterOptions.map(({ key, label }) => ({
    key,
    label,
    onClick: () => setFilter(key, filters.value[key] ? undefined : true),
    active: filters.value[key],
  })),
);

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
  }, modelKeywordDebounceMs);
}
</script>

<style>
.pulse-shadow {
  position: relative;

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: inherit;
    animation: pulse-shadow 1.5s;
    animation-iteration-count: 2;
  }
}

@keyframes pulse-shadow {
  0% {
    box-shadow: 0 0 0 0 var(--color-coral);
  }

  70% {
    box-shadow: 0 0 0 5px rgba(222, 84, 72, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(222, 84, 72, 0);
  }
}
</style>
