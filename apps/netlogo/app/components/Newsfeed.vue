<template>
  <section id="news-and-social" class="w-full bg-white px-4 lg:px-12 py-8">
    <h1 class="font-bold text-4xl lg:text-5xl text-gray-600 mb-4">News and Social Media</h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <!-- Official News Column -->
      <div class="flex flex-col">
        <h2 class="font-bold text-2xl text-gray-600 mb-4">Official News</h2>
        <div
          class="news-scroll-col overflow-y-auto max-h-[600px] rounded-lg border border-gray-200 bg-white"
        >
          <div v-for="item in visibleNews" :key="item.id" class="p-4 border-b-2 border-gray-100">
            <h4 class="font-bold text-lg mb-1">{{ item.title }}</h4>
            <span class="text-gray-500 text-sm block mb-2">{{ formatDate(item.date) }}</span>
            <MDC :value="item.body" />
          </div>

          <!-- Load More Button -->
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

      <!-- Bluesky / Social Media Column -->
      <div class="flex flex-col">
        <div class="mb-4 text-gray-600">
          <h2 class="font-bold text-2xl inline-block mr-2">
            On
            <a
              href="https://bsky.app/profile/netlogo.bsky.social"
              target="_blank"
              class="text-blue-500 hover:text-blue-600 no-underline"
            >
              Bluesky
            </a>
          </h2>
          <span class="text-lg">
            (and
            <a
              href="https://x.com/netlogo"
              target="_blank"
              class="text-blue-500 hover:text-blue-600 no-underline"
            >
              on X </a
            >)
          </span>
        </div>
        <div
          class="news-scroll-col overflow-y-auto max-h-[600px] rounded-lg border border-gray-200 bg-white p-2"
        >
          <ClientOnly>
            <bsky-embed
              username="netlogo.bsky.social"
              search="netlogo.bsky.social"
              mode=" "
              limit="3"
              link-target="_blank"
              custom-styles="img { max-height: 275px; }"
              load-more="true"
            />
          </ClientOnly>
        </div>
      </div>
    </div>
    <!-- <UAccordion :items="items" /> -->
  </section>
</template>

<script setup lang="ts">
// const items = ref([
//   {
//     label: "Is Nuxt UI free to use?",
//     content:
//       "Yes! Nuxt UI is completely free and open source under the MIT license. All 125+ components are available to everyone.",
//   },
//   {
//     label: "Can I use Nuxt UI with Vue without Nuxt?",
//     content:
//       "Yes! While optimized for Nuxt, Nuxt UI works perfectly with standalone Vue projects via our Vite plugin. You can follow the [installation guide](/docs/getting-started/installation/vue) to get started.",
//   },
//   {
//     label: "Is Nuxt UI production-ready?",
//     content:
//       "Yes! Nuxt UI is used in production by thousands of applications with extensive tests, regular updates, and active maintenance.",
//   },
// ]);

import { computed, ref } from "vue";
import type { NewsEntry } from "~/utils/api";

interface Props {
  newsData: NewsEntry[];
}

const props = withDefaults(defineProps<Props>(), {
  newsData: () => [],
});

const visibleCount = ref(3);

const visibleNews = computed(() => {
  return props.newsData.slice(0, visibleCount.value);
});

const handleLoadMore = () => {
  visibleCount.value += 3;
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

<style scoped>
.news-scroll-col {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
}

.news-scroll-col::-webkit-scrollbar {
  width: 8px;
}

.news-scroll-col::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.news-scroll-col::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 4px;
}
</style>
