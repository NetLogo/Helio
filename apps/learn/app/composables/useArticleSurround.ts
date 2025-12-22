import type { ContentNavigationItem } from '@nuxt/content';

type SurroundLinks = Ref<ContentNavigationItem[] | undefined, ContentNavigationItem[] | undefined>;

export async function useArticleSurround(
  path: string,
): Promise<Ref<ContentNavigationItem[] | undefined, ContentNavigationItem[] | undefined>> {
  const { data: surround } = await useAsyncData(`${path}-surround`, () => {
    return queryCollectionItemSurroundings('content', path, {
      fields: ['description'],
    });
  });
  return surround;
}

export type { SurroundLinks };
