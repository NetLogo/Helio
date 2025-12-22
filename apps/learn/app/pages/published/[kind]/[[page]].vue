<template>
  <PostListPage
    :page="page"
    :title="getTagTitle(kindParam)"
    :subtitle="getTagSubtitle(kindParam)"
    parent-name="NetLogo Learn"
    :breadcrumb="breadcrumb"
    :include-tags="tagNames"
    filter-strategy="some"
    :to="
      (n) => ({
        name: 'published-kind-page',
        params: { kind: kindParam, page: n },
      })
    "
  />
</template>

<script lang="ts">
const availableKinds = getTagsRecord();
</script>

<script setup lang="ts">
const route = useRoute();
const kindParam = route.params.kind as string;

if (!Object.keys(availableKinds).includes(kindParam)) {
  throw createError({
    statusCode: 404,
    statusMessage: `Content Kind '${kindParam}' Not Found in ${Object.keys(availableKinds).join(', ')}`,
  });
}

const tagNames = computed(() => {
  return kindParam === 'all'
    ? Object.entries(availableKinds)
        .filter(([key]) => key !== 'all')
        .map(([_, { tagName }]) => tagName)
    : [getTagName(kindParam)!];
});

const tagTitle = computed(() => (kindParam === 'all' ? 'Articles and Tutorials' : getTagTitle(kindParam)!));

useSeoMeta({
  title: `All ${tagTitle.value} - NetLogo Learn`,
  description: `Explore all ${tagTitle.value.toLowerCase()} on NetLogo Learn.`,
});

const page = computed(() => Number(route.params.page) || 1);

const breadcrumb = ref([
  { label: 'NetLogo Learn', to: '/', icon: 'i-lucide-box' },
  { label: getTagTitle(kindParam)!, to: '', icon: getTagIcon(kindParam)! },
]);
</script>
