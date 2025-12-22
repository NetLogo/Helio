<template>
  <UContainer class="my-[var(--block-top)] flex flex-col gap-[var(--space-lg)]">
    <UBreadcrumb :items="crumb" class="no-stylized-heading" />

    <UPageHero
      title="NetLogo Resources"
      description="Explore books, curricula, datasets, and other resources to enhance your NetLogo learning and teaching experience."
      class="no-stylized-heading"
      :ui="{
        container: 'py-8! pb-10 prose-tight prose-margin-tight',
      }"
    />

    <div class="flex flex-col lg:flex-row gap-4 bg-gray-50 border border-gray-200 rounded-lg p-[var(--space-lg)]">
      <USelectMenu
        v-model="selectedType"
        value-key="value"
        :items="typeOptions"
        placeholder="All Types"
        class="flex-1"
      />
      <USelectMenu
        v-model="selectedEndorsement"
        value-key="value"
        :items="endorsementOptions"
        placeholder="All Endorsements"
        class="flex-1"
      />
      <USelectMenu
        v-model="selectedLevel"
        value-key="value"
        :items="levelOptions"
        placeholder="All Levels"
        class="flex-1"
      />
      <USelectMenu
        v-model="selectedAudience"
        value-key="value"
        :items="audienceOptions"
        placeholder="All Audiences"
        class="flex-1"
      />
    </div>

    <UBlogPosts v-if="filteredResources.length > 0" class="no-stylized-heading mt-[var(--space-lg)]">
      <ResourceCard v-for="resource in filteredResources" :key="resource.stem" :resource="resource" class="basis-1/4" />
    </UBlogPosts>

    <UEmpty
      v-else
      class="mx-auto no-stylized-heading [&_h2]:m-0"
      icon="i-lucide-search-x"
      title="No Resources Found"
      description="Try adjusting your filters to see more results."
      variant="naked"
    />
  </UContainer>
</template>

<script setup lang="ts">
import type { ResourcesCollectionItem } from '@nuxt/content';
import { toSentenceCase } from '@repo/utils/std/string';

const { data: allResources } = await useAsyncData('resources-list', () => queryCollection('resources').all(), {
  transform: (data) =>
    data.map((item) => ({
      ...item,
      longDescription: undefined,
    })),
});
const crumb = useResourceBreadcrumb();

const selectedType = ref<string | null>(null);
const selectedEndorsement = ref<string | null>(null);
const selectedLevel = ref<string | null>(null);
const selectedAudience = ref<string | null>(null);

const typeOptions = computed(() => {
  const types = new Set(allResources.value?.map((r) => r.type) || []);
  return [
    { label: 'All Types' as string, value: null as string | null },
    ...Array.from(types).map((type) => ({
      label: toSentenceCase(type),
      value: type,
    })),
  ];
});

const endorsementOptions = [
  { label: 'All Endorsements', value: null },
  { label: 'Official', value: 'official' },
  { label: 'Endorsed', value: 'endorsed' },
  { label: 'Community', value: 'community' },
];

const levelOptions = [
  { label: 'All Levels', value: null },
  { label: 'Novice', value: 'novice' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
];

const audienceOptions = [
  { label: 'All Audiences', value: null },
  { label: 'Educators', value: 'educators' },
  { label: 'Students', value: 'students' },
  { label: 'Researchers', value: 'researchers' },
];

const filteredResources = computed<ResourcesCollectionItem[]>(() => {
  let resources = allResources.value || [];

  if (selectedType.value) {
    resources = resources.filter((r) => r.type === selectedType.value);
  }

  if (selectedEndorsement.value) {
    resources = resources.filter((r) => r.endorsement === selectedEndorsement.value);
  }

  if (selectedLevel.value) {
    resources = resources.filter((r) => r.level?.includes(selectedLevel.value as any));
  }

  if (selectedAudience.value) {
    resources = resources.filter((r) => r.targetAudience?.includes(selectedAudience.value as any));
  }

  return resources;
});

useSeoMeta({
  title: 'NetLogo Resources',
  description:
    'Explore books, curricula, datasets, and other resources to enhance your NetLogo learning and teaching experience.',
  ogTitle: 'NetLogo Resources',
  ogDescription:
    'Explore books, curricula, datasets, and other resources to enhance your NetLogo learning and teaching experience.',
  ogType: 'website',
  twitterTitle: 'NetLogo Resources',
  twitterSite: '@netlogo',
});

defineOgImageComponent('DocsSeo', {
  title: 'NetLogo Resources',
  description: 'Books, curricula, datasets, and more',
  theme: '#f31500',
  siteLogo: '/turtles.png',
});

onMounted(() => {
  const route = useRoute();
  if (route.query.type && typeof route.query.type === 'string') {
    selectedType.value = route.query.type.toLowerCase() as string;
  }
});
</script>
selectedType.value = route.query.type.toLowerCase() as string
