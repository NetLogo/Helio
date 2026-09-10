<script lang="ts" setup>
const route = useRoute();
const path = decodeURIComponent(route.path).replace(/\?/, '');
const article = await useArticle(path);
const surround = await useArticleSurround(path);

useArticleSEO(article.value);
useArticleOgImage(article.value);

const isVideoTutorial = computed(() => {
  return article.value?.meta.tags.includes(getTagName('video-tutorials'));
});
</script>

<template>
  <UPage :ui="{ root: 'lg:gap-10' }">
    <ScrollProgress />

    <!-- <StickyHeader>
      <CollapsibleHeader :label="article?.title || 'Learning Content'">
        <ArticleNavigation class="block" />
      </CollapsibleHeader>
    </StickyHeader> -->

    <template v-if="article">
      <ArticleBody :article="article" :surround="surround" />
    </template>

    <ErrorDisplay v-else :error-code="404" error-details="The requested page could not be found." />

    <template #left>
      <ArticleNavigation />
    </template>
    <template v-if="article && !isVideoTutorial" #right>
      <ArticleAside :article="article" />
    </template>
  </UPage>
</template>
