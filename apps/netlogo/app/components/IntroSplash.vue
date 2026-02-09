<template>
  <div v-if="pageData && pageData.length > 0" class="intro-splash-container py-8 pb-0">
    <!-- Tabs -->
    <div class="flex flex-wrap justify-center gap-3 mb-3">
      <button
        v-for="(entry, index) in pageData"
        :key="entry.id || index"
        class="px-5 py-2.5 rounded-full border-2 text-sm font-medium transition-all duration-200"
        :class="
          activeIndex === index
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
        "
        @click="activeIndex = index"
      >
        {{ entry.title }}
      </button>
    </div>

    <div v-if="activeEntry" class="bg-white rounded-2xl shadow-lg p-6 md:p-8">
      <MDC
        v-if="activeEntry.description"
        :value="activeEntry.description"
        class="mb-6 text-center"
      />

      <!-- Right side section now on the top for mobile -->
      <div
        v-if="activeEntry.featured_items && activeEntry.featured_items.length > 0"
        class="lg:hidden mb-6"
      >
        <div v-for="item in activeEntry.featured_items" :key="item.id" class="mb-4">
          <div v-if="item.column_words && item.column_words.length > 0" class="text-center">
            <h4 class="text-gray-700 font-medium mb-3">
              {{ item.word_column_title || "Example Topics" }}
            </h4>
            <div class="bg-gray-50 rounded-lg p-4 border border-gray-200 w-full">
              <div class="flex flex-wrap justify-center items-center gap-x-4 gap-y-2">
                <span v-for="word in item.column_words" :key="word.word" class="text-blue-600">
                  {{ word.word }}
                </span>
                <span class="text-gray-500 text-sm">and many more...</span>
              </div>
            </div>
          </div>

          <div v-if="item.column_images && item.column_images.length > 0" class="text-center mt-4">
            <h4 v-if="item.image_column_title" class="text-gray-700 font-medium mb-3">
              {{ item.image_column_title }}
            </h4>
            <div class="bg-gray-50 rounded-lg p-4 border border-gray-200 inline-block">
              <div class="flex flex-wrap justify-center items-center gap-x-2 gap-y-1">
                <button
                  v-for="(img, imgIndex) in item.column_images"
                  :key="img.word"
                  class="transition-colors"
                  :class="
                    selectedImageIndex === imgIndex
                      ? 'text-blue-800 font-medium'
                      : 'text-blue-600 hover:text-blue-800'
                  "
                  @click="selectedImageIndex = imgIndex"
                >
                  {{ img.word }}
                </button>
                <span class="text-gray-500 text-sm">and many more...</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row items-center lg:items-start">
        <!-- Demo Image (Left Side) -->
        <div class="flex-1 flex justify-center">
          <div v-if="demoImageId" class="rounded-lg overflow-hidden shadow-md">
            <img
              :src="`${backendUrl}/assets/${demoImageId}`"
              :alt="activeEntry.title"
              class="max-w-full h-auto max-h-[475px] object-contain"
            />
          </div>
          <div
            v-else
            class="w-full max-w-md h-64 bg-gray-200 rounded-lg flex items-center justify-center"
          >
            <span class="text-gray-400">Demo Image</span>
          </div>
        </div>

        <!-- Right side sections on lg screens -->
        <div
          v-if="activeEntry.featured_items && activeEntry.featured_items.length > 0"
          class="hidden lg:block flex-shrink-0 w-full lg:w-auto"
        >
          <div v-for="item in activeEntry.featured_items" :key="item.id" class="mb-4">
            <!-- Example subject area column-->
            <div v-if="item.column_words && item.column_words.length > 0" class="text-center">
              <h4 class="text-gray-700 font-medium mb-3">
                {{ item.word_column_title || "Example Topics" }}
              </h4>
              <div
                class="bg-gray-50 rounded-lg p-4 border border-gray-200 inline-block min-w-[160px]"
              >
                <ul class="space-y-0">
                  <li
                    v-for="word in item.column_words"
                    :key="word.word"
                    class="border-b border-gray-200 last:border-b-0 py-2 first:pt-0 last:pb-0"
                  >
                    <span class="text-blue-600">{{ word.word }}</span>
                  </li>
                  <li class="pt-2 text-gray-500 text-sm">and many more...</li>
                </ul>
              </div>
            </div>

            <!-- Image Column clickable subjects that change demo image -->
            <div
              v-if="item.column_images && item.column_images.length > 0"
              class="text-center mt-4"
            >
              <h4 v-if="item.image_column_title" class="text-gray-700 font-medium mb-3">
                {{ item.image_column_title }}
              </h4>
              <div
                class="bg-gray-50 rounded-lg p-4 border border-gray-200 inline-block min-w-[160px]"
              >
                <ul class="space-y-0">
                  <li
                    v-for="(img, imgIndex) in item.column_images"
                    :key="img.word"
                    class="border-b border-gray-200 last:border-b-0 py-2 first:pt-0 last:pb-0"
                  >
                    <button
                      class="w-full text-center transition-colors"
                      :class="
                        selectedImageIndex === imgIndex
                          ? 'text-blue-800 font-medium'
                          : 'text-blue-600 hover:text-blue-800'
                      "
                      @click="selectedImageIndex = imgIndex"
                    >
                      {{ img.word }}
                    </button>
                  </li>
                  <li class="pt-2 text-gray-500 text-sm">and many more...</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IntroSplashEntry } from "~/utils/api";

const props = defineProps<{
  pageData: IntroSplashEntry[];
}>();

const config = useRuntimeConfig();
const backendUrl = config.public.backendUrl as string;

const activeIndex = ref(0);
const selectedImageIndex = ref(0);

const activeEntry = computed(() => {
  return props.pageData?.[activeIndex.value] ?? null;
});

// Reset selected image index when changing tabs
watch(activeIndex, () => {
  selectedImageIndex.value = 0;
});

// Get the demo image - first try featured_items[0].image, then fallback to selected column_image
const demoImageId = computed(() => {
  const featuredItem = activeEntry.value?.featured_items?.[0];
  if (!featuredItem) return null;

  // First try the direct image field
  if (featuredItem.image?.id) {
    return featuredItem.image.id;
  }

  // Fallback to selected column_image if available
  if (featuredItem.column_images?.[selectedImageIndex.value]?.image?.id) {
    return featuredItem.column_images[selectedImageIndex.value].image.id;
  }

  return null;
});
</script>

<style scoped>
.intro-splash-container {
  max-width: 1000px;
  margin: 0 auto;
}
</style>
