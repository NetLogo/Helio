<template>
  <div class="container py-3 pb-8 text-start">
    <h1 class="text-3xl lg:text-4xl font-bold mb-6">Official News</h1>

    <p v-if="newsData.length === 0" class="text-gray-500">No news available.</p>

    <div v-else>
      <div v-for="item in visibleNews" :key="item.id" class="p-4 border-b-2 border-gray-300">
        <h3 class="font-bold text-2xl mt-4 mb-1">{{ item.title }}</h3>
        <span class="text-gray-500 text-md block mb-2">{{ formatDate(item.date) }}</span>
        <MDC :value="item.body" />
      </div>

      <div v-if="visibleCount < newsData.length" class="text-center py-4">
        <button
          class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition-colors"
          @click="handleLoadMore"
        >
          Load more news
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NewsEntry } from "~/utils/api";

const props = withDefaults(
  defineProps<{
    newsData?: NewsEntry[];
  }>(),
  {
    newsData: () => [],
  },
);

const visibleCount = ref(5);

const visibleNews = computed(() => {
  return props.newsData.slice(0, visibleCount.value);
});

const handleLoadMore = () => {
  visibleCount.value += 5;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};
</script>
