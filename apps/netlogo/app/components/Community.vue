<template>
  <section class="py-12 hyphens-none">
    <div class="mb-8">
      <h1 class="font-bold text-4xl lg:text-5xl text-gray-600 mb-4">Community</h1>
      <p class="text-gray-600 dark:text-gray-400">
        Join NetLogo community and start contributing today.
      </p>
    </div>

    <div class="flex flex-wrap justify-center gap-6">
      <UPageCard
        v-for="community in communities"
        :key="community.title"
        class="flex flex-col h-auto w-full max-w-sm"
      >
        <template #header>
          <div class="flex items-center gap-3">
            <img
              v-if="community.icon?.id"
              :src="`${backendUrl}/assets/${community.icon.id}`"
              :alt="community.title"
              class="w-12 h-12 rounded-lg object-contain bg-blue-100 p-2"
            />
            <div v-else class="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <UIcon name="i-heroicons-cube" class="w-6 h-6 text-blue-600" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mt-0">
              {{ community.title }}
            </h3>
          </div>
        </template>

        <template #description>
          <p class="text-gray-600 dark:text-gray-400 flex-grow">
            {{ community.description }}
          </p>
        </template>

        <template #footer>
          <NuxtLink
            :to="community.link"
            :external="isExternalLink(community.link)"
            :target="isExternalLink(community.link) ? '_blank' : undefined"
          >
            <Button variant="default" size="lg" class="mt-2"> Go </Button>
          </NuxtLink>
        </template>
      </UPageCard>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CommunityEntry } from "~/utils/api";
import Button from "../../../../packages/vue-ui/src/components/Button.vue";

const props = defineProps<{
  communities: CommunityEntry[];
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
