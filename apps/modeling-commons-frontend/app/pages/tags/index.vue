<template>
  <UContainer>
    <div class="space-y-8">
      <SectionHeader
        title="Models by Tag"
        subtitle="Browse the topics the community has tagged its models with."
        heading="h4"
      />

      <SearchBar v-model="prefix" placeholder="Search tags..." />

      <Error
        v-if="error"
        icon="i-lucide-tag"
        title="Unable to load tags"
        message="Something went wrong while fetching tags. Please refresh the page or try again later."
      />

      <div v-else-if="items.length" class="space-y-8">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <TagCard
            v-for="item in items"
            :key="item.tag.id"
            :name="item.tag.name"
            :display-name="item.tag.displayName"
            :description="item.description"
          />
        </div>

        <p v-if="totalCount" class="mx-auto text-center text-xs text-dimmed">
          Showing {{ items.length }} of {{ totalCount }} tags
        </p>
      </div>

      <Empty
        v-else-if="!pending"
        icon="i-lucide-tag"
        :title="isSearching ? 'No tags found' : 'No tags yet'"
        :description="
          isSearching
            ? 'No tags match your search. Try a different spelling or a broader term.'
            : 'Tags will show up here once models have been tagged.'
        "
      />

      <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <TagCardSkeleton v-for="i in 8" :key="i" />
      </div>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import { useInfiniteScroll } from "@vueuse/core";

useSeoMeta({
  title: "Models by Tag",
  description: "Browse NetLogo models by topic on the Modeling Commons.",
});

const popular = reactive(usePopularTags());
const search = reactive(useTags());

const prefix = computed({
  get: () => search.prefix ?? "",
  set: (value: string) => {
    search.prefix = value;
  },
});

const isSearching = computed(() => (search.prefix ?? "").trim().length > 0);

// Prefix search has no counts to report; only the popular listing carries them.
const items = computed(() =>
  isSearching.value
    ? search.tags.map((tag) => ({ tag, description: undefined }))
    : popular.tags.map(({ tag, modelCount }) => ({
        tag,
        description: `tagged ${pluralizeWithCount(modelCount, "time")}`,
      })),
);

const pending = computed(() => (isSearching.value ? search.pending : popular.pending));
const error = computed(() => (isSearching.value ? search.error : popular.error));
const totalCount = computed(() => (isSearching.value ? search.count : popular.count));
const canLoadMore = computed(() => (isSearching.value ? search.canLoadMore : popular.canLoadMore));

onMounted(() => {
  useInfiniteScroll(
    window,
    () => {
      if (isSearching.value) search.loadNextPage();
      else popular.loadNextPage();
    },
    {
      distance: 25,
      interval: 250,
      canLoadMore: () => canLoadMore.value,
    },
  );
});
</script>
