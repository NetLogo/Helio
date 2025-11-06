<script setup lang="ts">
import TurtlesSVG from '@repo/vue-ui/assets/brands/Turtles.svg';
import { useDebounceFn } from '@vueuse/core';
import type { IFuseOptions } from 'fuse.js';
import links from './links.json';
import { filters, getNavigationItems } from './navigation';

const { data: navigation } = await useAsyncData(
  'navigation',
  () => getNavigationItems(() => queryCollectionNavigation('content', ['seo', 'meta'])),
  { server: false },
);

const { data: files } = await useLazyAsyncData(
  'search',
  () =>
    // prettier-ignore
    queryCollectionSearchSections('content', {
      ignoredTags: ['code', 'span', 'h1']
    })
    .then((res) =>
      res.filter((file) =>
        filters.noH1(file) && filters.noCatalogIndex(file)
      ),
    ),
  { server: false },
);

const fuseOptions: IFuseOptions<unknown> = {
  ignoreDiacritics: true,
  shouldSort: true,
  threshold: 0.3,
  distance: 5,
  isCaseSensitive: false,
  ignoreFieldNorm: true,
  findAllMatches: false,
  minMatchCharLength: 3,
  keys: [
    { name: 'title', weight: 0.5 },
    { name: 'description', weight: 0.4 },
    { name: 'headings', weight: 0.4 },
    { name: 'keywords', weight: 0.2 },
    { name: 'body', weight: 0.2 },
  ],
};

const searchTerm = ref('');
const updateSearchTerm = useDebounceFn((term: string) => {
  searchTerm.value = term;
}, 50);
</script>

<template>
  <ClientOnly>
    <LazyUContentSearch
      title="Search the docs"
      placeholder="Enter a primitive or topic..."
      :files="files"
      :fuse="{ resultLimit: 10, fuseOptions }"
      :color-mode="false"
      :links="links"
      :navigation="navigation"
      v-bind="$attrs"
      :search-term="searchTerm"
      :loading="!files"
      @update:search-term="updateSearchTerm($event)"
    >
      <template #empty>
        <div class="p-4 text-center text-sm text-gray-500 flex flex-col gap-2">
          <!-- prettier-ignore -->
          <span>No results found for "<strong>{{ searchTerm }}</strong>"</span>
          <!-- prettier-ignore -->
          <span>Try searching for a NetLogo primitive, command, or a concept. <br>For example, type in <strong>“setup”</strong> or <strong>“repeat”</strong>.</span>
        </div>
      </template>

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
            <TurtlesSVG class="w-8 h-8" />
          </span>
        </div>
      </template>
    </LazyUContentSearch>
  </ClientOnly>
</template>
