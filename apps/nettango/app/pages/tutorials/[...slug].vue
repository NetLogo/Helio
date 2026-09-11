<script lang="ts" setup>
import type { ContentCollectionItem } from '@nuxt/content';
import type { DocumentMetadataSchema } from "@repo/netlogo-docs/metadata";
import type z from 'zod';

definePageMeta({
  layout: 'clean',
});

const {
  public: {
    website: { productName },
  },
} = useRuntimeConfig();

const route = useRoute();
const path = decodeURIComponent(route.path).replace(/\?/, '');

// Disabled until feature is rolled out.
// --Omar I. (05-10-2026)
provide('prim-tooltip-disabled', true);

const { data: page } = await useAsyncData(path, () => {
  return queryCollection('content').path(path).first();
});


const content = useContent(page.value);
const { title, description, keywords } = resolveMeta(content);


defineOgImageComponent('DocsSeo', {
  title,
  description,
  theme: '#f31500',
  siteLogo: '/turtles.png',
  siteName: productName,
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
};
function resolveMeta(page: ContentCollectionItem): ResolvedMeta {
  if (!isPageContent(page)) {
    return {
      title: 'Page Not Found',
      description: 'The requested page could not be found.',
      keywords: 'NetLogo, Documentation',
    };
  }
  const seo = page.seo;
  const meta = page.meta as z.infer<typeof DocumentMetadataSchema>;

  const title = [meta.title, seo.title, 'NetLogo Docs'].filter(Boolean).at(0)!;
  const description = [meta.description, seo.description, 'NetLogo Documentation'].filter(Boolean).at(0)!;
  const keywords = [meta.keywords, seo.keywords, 'NetLogo', 'Documentation'].filter(Boolean).flat().join(', ');

  return { title, description, keywords };
}

</script>


<template>
  <!-- eslint-disable-next-line vue/no-multiple-template-root -->
  <UPage :ui="{ root: 'lg:gap-10' }">
    <ScrollProgress />

    <StickyHeader>
      <CollapsibleHeader :label="page?.title ?? 'Documentation'">
        <ArticleNavigation class="block" />
      </CollapsibleHeader>
    </StickyHeader>

    <template v-if="page">
      <ArticleBody :article="page" :surround="[]" />
    </template>

    <ErrorDisplay v-else :error-code="404" error-details="The requested page could not be found." />

    <template #left>
      <ArticleNavigation/>
    </template>

    <template #right>
      <ArticleAside v-if="page" :article="page" />
    </template>
  </UPage>
</template>
