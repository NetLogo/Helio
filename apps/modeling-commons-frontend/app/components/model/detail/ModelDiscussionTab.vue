<template>
  <div id="discussion" class="p-2 lg:p-6">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-semibold text-highlighted">Discussion</h3>
      <div class="flex items-center gap-2 text-sm">
        <span class="text-muted">Sort by</span>
        <USelectMenu
          v-model="selectedSort"
          :items="sortOptions"
          :search-input="false"
          class="lg:w-32"
          size="sm"
        />
      </div>
    </div>

    <CommentsSection :model-id="modelId" :sort="selectedSort.value" />
  </div>
</template>

<script setup lang="ts">
import type { CommentSort } from "~/composables/comments/useComments";

defineProps<{
  modelId: string;
}>();

type SortOption = { label: string; value: CommentSort };

const sortOptions: Array<SortOption> = [
  { label: "Oldest", value: "createdAt" },
  { label: "Most liked", value: "likes" },
];

const selectedSort = ref<SortOption>({ label: "Oldest", value: "createdAt" });
</script>
