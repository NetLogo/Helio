<script lang="ts" setup>
const allLearningPaths = await useLearningPathsInfo();

const metadata = ref({
  title: getTagTitle('learning-paths'),
  subtitle: 'Curated articles, tutorials and videos to help you learn more effectively.',
  description: 'Explore our curated learning paths to enhance your skills and knowledge.',
});

useSeoMeta({
  title: metadata.value.title,
  description: metadata.value.description,
});

const breadcrumb = useLearnBreadcrumb(
  ref([{ label: metadata.value.title, to: '/learning-paths', icon: getTagIcon('learning-paths') }]),
);
</script>

<template>
  <UContainer class="my-(--block-top) flex flex-col gap-8">
    <UBreadcrumb v-if="breadcrumb.length" :items="breadcrumb" class="[&_li]:m-0" />

    <UPageHero
      :title="metadata.title"
      :description="metadata.subtitle"
      class="no-stylized-heading"
      :ui="{
        container: 'py-8! pb-10 prose-tight prose-margin-tight',
      }" />

    <div class="flex flex-col justify-center items-center w-full py-5">
      <UBlogPosts class="no-stylized-heading">
        <UBlogPost
          v-for="lp in allLearningPaths"
          :key="lp.id"
          :title="lp.title"
          :description="lp.subtitle"
          :image="lp.thumbnail"
          class="basis-1/4"
          variant="outline"
          :to="addLeadingSlash(lp.stem)"
          :ui="{
            title: 'my-3',
          }"
        />
      </UBlogPosts>

      <UEmpty
        v-if="allLearningPaths?.length === 0"
        class="mx-auto no-stylized-heading [&_h2]:m-0"
        icon="i-lucide-file-search"
        :title="`No Learning Paths Available`"
        :description="`It looks like we don't have any learning paths at this time.`"
        variant="naked"
      />
      <span class="block h-8 w-full"></span></div
  ></UContainer>
</template>
