<template>
  <NuxtRouteAnnouncer />
  <NuxtLoadingIndicator color="var(--ui-primary)" />
  <NuxtLayout>
    <NuxtErrorBoundary>
      <NuxtPage />
    </NuxtErrorBoundary>
    <NuxtErrorBoundary>
      <ClientOnly>
        <LazyUContentSearch
          v-model:search-term="searchTerm"
          :files="files"
          :navigation="navigation"
          :groups="searchGroups"
          :links="searchLinks"
          :color-mode="false"
          :fuse="{
            resultLimit: 42,
            fuseOptions: {
              threshold: 0,
            },
          }"
        >
          <template #footer>
            <div
              class="flex gap-5 items-center justify-start [&>span]:whitespace-nowrap p-2 text-center text-sm text-gray-500 select-none"
            >
              <!-- prettier-ignore -->
              <span><UKbd value="meta" /> + <UKbd>K</UKbd> to toggle search</span>
              <!-- prettier-ignore -->
              <span><UKbd value="arrowup" />/<UKbd value="arrowdown" /> to navigate results</span>
              <!-- prettier-ignore -->
              <span><UKbd value="enter" /> to open result</span>
              <span class="ml-auto flex items-center gap-1">
                <Icon name="netlogo-netlogo-desktop" class="w-8 h-8" />
              </span>
            </div> </template
        ></LazyUContentSearch>
      </ClientOnly>
    </NuxtErrorBoundary>
  </NuxtLayout>
</template>

<script setup lang="ts">
const { searchGroups, searchLinks, searchTerm } = useNavigation();

const [{ data: navigation }, { data: files }] = await Promise.all([
  useAsyncData('navigation', () => Promise.all([queryCollectionNavigation('content')]), {
    transform: (data) => data.flat(),
  }),

  useLazyAsyncData(
    'search-files',
    async () => Promise.all([queryCollectionSearchSections('content', { ignoredTags: ['h1'] })]),
    {
      server: false,
      transform: (data) => data.flat().filter((file) => !(file.id.includes('#') && file.level === 1)),
    },
  ),
]);

useHead({
  titleTemplate: (title) => (title ? `${title} - NetLogo Learn` : 'NetLogo Learn: Guides and Tutorials'),
});

useLazyAsyncData(
  'search',
  () => {
    return Promise.all([
      queryCollectionSearchSections('content'),
      queryCollectionSearchSections('learningPaths'),
      queryCollectionSearchSections('primitives'),
    ]);
  },
  {
    server: false,
    transform: (data) => data.flat(),
  },
);

if (import.meta.server) {
  useHead({
    meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    htmlAttrs: {
      lang: 'en',
    },
  });
  useSeoMeta({
    ogSiteName: 'NetLogo Learn',
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterSite: 'netlogo',
  });
}
</script>
