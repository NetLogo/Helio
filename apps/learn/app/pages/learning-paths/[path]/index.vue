<script lang="ts" setup>
const route = useRoute();

const learningPathRoute = route.path.split('/').slice(0, 3).join('/');
const lp = await useLearningPath(learningPathRoute);

const lpProgressStore = useLearningPathsProgress();
lpProgressStore.ensurePath(lp.value);

const navigation = useLearningPathNavigation(lp);

useSeoMeta({
  title: lp.value.title,
  description: lp.value.subtitle,
  ogTitle: lp.value.title,
  ogDescription: lp.value.subtitle,
  ogType: 'article',
  twitterTitle: lp.value.title,
  twitterSite: '@netlogo',
});

defineOgImageComponent('ThumbnailSeo', {
  title: lp.value.title,
  description: lp.value.subtitle,
  theme: '#f31500',
  siteLogo: '/turtles.png',
  thumbnailUrl: lp.value.thumbnail ?? '/images/default-thumbnail.png',
});
</script>

<template>
  <!-- eslint-disable-next-line vue/no-multiple-template-root -->
  <UPage v-if="lp" :ui="{ root: 'lg:gap-0', left: 'lg:col-span-3', center: 'relative lg:col-span-7', right: 'hidden' }">
    <StickyHeader>
      <LearningPathMobileNavigation :navigation :myself="{ lp }" />
    </StickyHeader>
    <UPageBody class="px-5">
      <div class="relative">
        <img
          :src="lp.thumbnail || '/images/default-thumbnail.png'"
          alt="Learning Path Thumbnail"
          class="w-full h-full absolute inset-0 object-cover rounded-lg brightness-30"
        />
        <UPageHero
          :title="lp.title"
          :description="lp.subtitle"
          class="no-stylized-heading"
          :ui="{
            title: 'text-white! text-4xl!',
            description: 'text-slate-100',
          }"
        />
      </div>
      <MDC :value="lp.description" class="prose prose-medium prose-text-medium" />
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
