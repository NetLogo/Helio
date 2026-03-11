<script lang="ts" setup>
const route = useRoute();
const articlePath = slugToPath(route.params.slug ?? []);

const article = await useArticle(articlePath);
useArticleSEO(article.value);
useArticleOgImage(article.value);

const learningPathRoute = route.path.split('/').slice(0, 3).join('/');
const lp = await useLearningPath(learningPathRoute);

const {
  public: {
    website: { productWebsite },
  },
} = useRuntimeConfig();

useHead({
  link: [
    {
      rel: 'canonical',
      href: `${productWebsite}${addLeadingSlash(articlePath)}`,
    },
  ],
  meta: [
    {
      name: 'robots',
      content: 'noindex, follow',
    },
  ],
});

const lpProgressStore = useLearningPathsProgress();
lpProgressStore.ensurePath(lp.value);

const navigation = useLearningPathNavigation(lp);
const myself = useLearningPathMyself(navigation, route);

const surround = useLearningPathSurround(navigation, articlePath);

const markCompleted = (articlePath: string, completed: boolean = true) => {
  lpProgressStore.markArticleComplete(articlePath, completed);
};
</script>

<template>
  <!-- eslint-disable-next-line vue/no-multiple-template-root -->
  <UPage
    v-if="article"
    :ui="{ root: 'lg:gap-0', left: 'lg:col-span-3', center: 'relative lg:col-span-7', right: 'hidden' }"
  >
    <ScrollProgress />

    <StickyHeader>
      <LearningPathMobileNavigation :navigation :myself />
      <LearningPathNavigationButtons :mark-completed :myself="myself" />
    </StickyHeader>

    <UPageBody>
      <ArticleBody :article="article" :surround="surround" mode="medium" />
    </UPageBody>

    <template #left>
      <UPageAside :ui="{ root: 'pr-0!' }">
        <UContentNavigation :navigation="navigation" :collapsible="false" />
      </UPageAside>
    </template>
  </UPage>

  <UPage v-else>
    <ErrorDisplay :error-code="404" error-details="The requested page could not be found." />
  </UPage>
</template>
