import type { ResourcesCollectionItem } from '@nuxt/content';
import { createSharedComposable } from '@vueuse/core';

async function _useResource(path: string): Promise<Ref<ResourcesCollectionItem>> {
  const route = useRoute();
  const { data, error } = await useAsyncData(path, () =>
    queryCollection('resources').where('stem', '=', route.path.replace(/^\//, '')).first(),
  );

  if (error.value || !data.value) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch resource at path: ${path}: ${error.value?.message || 'Resource not found'}`,
    });
  }

  return data as Ref<ResourcesCollectionItem>;
}

export const useResource = import.meta.client ? createSharedComposable(_useResource) : _useResource;
