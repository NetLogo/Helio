<template>
  <component
    :is="CatalogComponent"
    :label="dictionaryDisplayName"
    :items="(catalogItems || []) as SideCatalogItem[]"
    item-prefix="primitive:"
    :query="makeQueryFunction"
    :is-selected="isSelected"
    :selected-item-label="currentItemLabel"
    :scroll-margin-top="150"
    :is-loading="loading"
    with-route-transition
    :class="{
      'lg:mt-5 mb-10 px-2 mx-auto nl-container-width min-h-[70vh]': isOffline
    }"
  >
    <div class="w-full [&>.min-h-screen]:min-h-0 lg:pr-5 pb-10 min-h-rest">
      <slot />

      <p class="p-4 md:p-0">
        Take me to the full
        <Anchor :href="removeHtmlExtension(dictionaryHomeDirectory)"> {{ dictionaryDisplayName }} </Anchor>.
      </p>

      <Surround v-if="!isOffline" :surround="surround" class="mt-auto"/>
    </div>
  </component>
</template>

<script setup lang="ts">
import { wrapCacheLocalStorage } from '@repo/utils/lib/storage/cached-local-storage';
import { removeHtmlExtension } from '~/utils/url';
import type { CatalogItemData, PrimitiveCatalogProps, SideCatalogItem } from './types';

const {
  public: {
    website: { productVersion },
    isOffline
  },
} = useRuntimeConfig();

const SideCatalog = resolveComponent('SideCatalog') as typeof import('@repo/vue-ui')['SideCatalog'];
const CatalogComponent = isOffline ? 'div' : SideCatalog;

const { dictionaryDisplayName, dictionaryHomeDirectory, indexFileURI, currentItemId, currentItemLabel, primRoot } =
  defineProps<PrimitiveCatalogProps>();

const isSelected = (current: SideCatalogItem): boolean => {
  const item = current as CatalogItemData;
  return item.id === currentItemId;
};

const makeQueryFunction = (s0: string): Array<SideCatalogItem> => {
  const s = s0.toLowerCase();
  const items = catalogItems.value || [];
  return items.filter((item) => item.title.toLowerCase().includes(s));
};

const fetcher = async (url: string): Promise<Array<CatalogItemData>> => {
  const text = await $fetch<string>(url);
  return text
    .split('\n')
    .map((line) => line.trim())
    .map((line) => line.split(' '))
    .map((parts) => parts.filter((part) => part.length > 0))
    .filter((parts) => parts.length >= 2)
    .map((parts) => ({
      title: parts.slice(0, -1).join(' '),
      id: removeHtmlExtension(parts.at(-1)!),
    }))
    .map(({ id, title }) => ({
      id,
      title,
      url: '/' + [primRoot, encodeURIComponent(id)].join('/'),
    }));
};

const {
  data: catalogItems,
  pending,
  error,
} = await useLazyAsyncData(
  indexFileURI,
  wrapCacheLocalStorage([productVersion, 'primitive-catalog', indexFileURI].join('-'), null, () =>
    fetcher(indexFileURI),
  ),
  { server: false },
);

const loading = !Array.isArray(catalogItems.value) && !error ? true : pending;
</script>
