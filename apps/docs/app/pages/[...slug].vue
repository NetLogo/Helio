<script lang="ts" setup>
import type { ContentCollectionItem } from '@nuxt/content';
import PrimitiveCatalog from '~/components/PrimitiveCatalog/PrimitiveCatalog.vue';
import { PrimitiveCatalogSchema } from '~/components/PrimitiveCatalog/types';
import type { DocumentMetadata } from '~~/lib/docs/schema';

const productInfo = useProductInfo();

const route = useRoute();
const path = decodeURIComponent(route.path).replace(/\?/, '');
const { data: page } = await useAsyncData(path, () => {
  return queryCollection('content').path(path).first();
});

const { data: surround } = await useAsyncData(`${path}-surround`, () => {
  return queryCollectionItemSurroundings('content', path, {
    fields: ['description'],
  });
});

const content = useContent(page.value);
const { title, description, keywords } = resolveMeta(content);

const layoutComponent = computed(() => {
  const { layout } = resolveMeta(content);

  switch (layout) {
    case 'catalog':
      return {
        component: PrimitiveCatalog,
        props: {
          ...PrimitiveCatalogSchema.parse(content.meta as DocumentMetadata),
          surround: surround.value,
        },
      };
    case 'default':
    default:
      return null;
  }
});

defineOgImageComponent('DocsSeo', {
  title,
  description,
  theme: '#f31500',
  siteLogo: '/turtles.png',
  siteName: productInfo.productName,
});

useSeoMeta({
  robots: 'index, follow',
  author: 'Center for Connected Learning and Computer-Based Modeling',
  generator: 'Nuxt Content',
  ogDescription: description,
  ogTitle: title,
  ogType: 'article',
  title: `${title}`,
  description: description,
  keywords: keywords,
});

function isPageContent(item: ContentCollectionItem | null | undefined): item is ContentCollectionItem {
  return item !== null && item !== undefined;
}

function useContent(item: ContentCollectionItem | null | undefined): ContentCollectionItem {
  if (!isPageContent(item)) {
    useHead({
      title: 'Page Not Found - NetLogo Docs',
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    });
  }
  return item as ContentCollectionItem;
}

type ResolvedMeta = {
  title: string;
  description: string;
  keywords: string;
  layout: string;
};
function resolveMeta(page: ContentCollectionItem): ResolvedMeta {
  if (!isPageContent(page)) {
    return {
      title: 'Page Not Found',
      description: 'The requested page could not be found.',
      keywords: 'NetLogo, Documentation',
      layout: 'default',
    };
  }
  const seo = page.seo;
  const meta = page.meta as DocumentMetadata;

  const title = [meta.title, seo.title, 'NetLogo Docs'].filter(Boolean).at(0)!;
  const description = [meta.description, seo.description, 'NetLogo Documentation'].filter(Boolean).at(0)!;
  const keywords = [meta.keywords, seo.keywords, 'NetLogo', 'Documentation'].filter(Boolean).flat().join(', ');

  const layout = meta.layout ?? 'default';

  return { title, description, keywords, layout };
}
</script>

<template>
  <!-- eslint-disable-next-line vue/no-multiple-template-root -->
  <template v-if="page">
    <component :is="layoutComponent.component" v-if="layoutComponent" v-bind="layoutComponent.props" class="main">
      <ContentRenderer :value="page" tag="article" class="prose" />
    </component>

    <ContentRenderer v-else :value="page" tag="main" class="prose min-h-screen" />
  </template>
  <ErrorDisplay v-else :error-code="404" error-details="The requested page could not be found." />
</template>
