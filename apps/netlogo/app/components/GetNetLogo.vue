<template>
  <section class="py-12" id="get-netlogo">
    <div class="mb-8">
      <h1 class="font-bold text-4xl lg:text-5xl text-gray-600 mb-4">Get NetLogo</h1>
      <p class="text-gray-600 dark:text-gray-400">
        There are five different products in NetLogo. Find the one that suits your need.
      </p>
    </div>

    <div class="flex flex-wrap justify-center gap-6">
      <UPageCard
        v-for="product in products"
        :key="product.title"
        class="flex flex-col h-auto w-full max-w-sm"
      >
        <template #header>
          <div class="flex items-center gap-3">
            <img
              v-if="product.icon?.id"
              :src="`${backendUrl}/assets/${product.icon.id}`"
              :alt="product.title"
              class="w-12 h-12 rounded-lg object-contain bg-blue-100 p-2"
            />
            <div v-else class="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <UIcon name="i-heroicons-cube" class="w-6 h-6 text-blue-600" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mt-0">
              {{ product.title }}
            </h3>
          </div>
        </template>

        <template #description>
          <p class="text-gray-600 dark:text-gray-400 flex-grow">
            {{ product.content }}
          </p>
        </template>

        <template #footer>
          <Button
            variant="default"
            size="lg"
            class="mt-2"
            :href="product.link"
            :target="isExternalLink(product.link) ? '_blank' : '_self'"
          >
            {{ product.button_text || "Learn More" }}
          </Button>
        </template>
      </UPageCard>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { GetNetLogoEntry } from "~/utils/api";
import Button from "../../../../packages/vue-ui/src/components/Button.vue";

const props = defineProps<{
  products: GetNetLogoEntry[];
}>();

const config = useRuntimeConfig();
const backendUrl = config.public.backendUrl as string;

const isExternalLink = (link: string) => {
  return link?.startsWith("http://") || link?.startsWith("https://");
};
</script>

<style scoped>
:deep(.flex-grow) {
  flex-grow: 1;
}
:deep(p) {
  hyphens: none !important;
}
</style>
