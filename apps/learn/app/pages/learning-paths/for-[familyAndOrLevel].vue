<script lang="ts">
const Keys = {
  family: ['educators', 'students', 'researchers'] as const,
  level: ['novice', 'intermediate', 'advanced'] as const,
};

const Icons = {
  educators: 'i-lucide-school',
  students: 'i-lucide-graduation-cap',
  researchers: 'i-lucide-network',
  novice: 'i-lucide-baby',
  intermediate: 'i-lucide-user-check',
  advanced: 'i-lucide-settings',
};

class FamilyOrLevelRoute {
  family: (typeof Keys.family)[number] | undefined = undefined;
  level: (typeof Keys.level)[number] | undefined = undefined;
  state: 'family' | 'level' | 'both';

  constructor(familyAndOrLevel: string) {
    const parts = familyAndOrLevel.split('-');
    for (const part of parts) {
      // @ts-expect-error -- Narrow type
      if (Keys.family.includes(part)) {
        this.family = part as (typeof Keys.family)[number];
        // @ts-expect-error -- Narrow type
      } else if (Keys.level.includes(part)) {
        this.level = part as (typeof Keys.level)[number];
      }
    }

    if (this.family && this.level) {
      this.state = 'both';
    } else if (this.family) {
      this.state = 'family';
    } else if (this.level) {
      this.state = 'level';
    } else {
      throw new Error(`Invalid familyAndOrLevel parameter: ${familyAndOrLevel}`);
    }
  }

  get title(): string {
    const titleParts = ['Learning Paths'];
    if (this.family) {
      titleParts.push(`for ${this.family.charAt(0).toUpperCase() + this.family.slice(1)}`);
    }
    if (this.level) {
      titleParts.push(`(${this.level.charAt(0).toUpperCase() + this.level.slice(1)})`);
    }
    return titleParts.join(' ');
  }

  get subtitle(): string {
    const subtitleParts = [];
    switch (this.state) {
      case 'family':
        subtitleParts.push(`Curated articles, tutorials and videos to help ${this.family} enhance their skills.`);
        break;
      case 'level':
        subtitleParts.push(`Curated articles, tutorials and videos for ${this.level} learners.`);
        break;
      case 'both':
        subtitleParts.push(
          `Curated articles, tutorials and videos to help ${this.family}s at the ${this.level} level enhance their skills.`,
        );
        break;
    }
    return subtitleParts.join(' ');
  }

  get description(): string {
    const descriptionParts = [];
    switch (this.state) {
      case 'family':
        descriptionParts.push(
          `Explore our curated learning paths designed specifically for ${this.family}s to improve their skills and knowledge.`,
        );
        break;
      case 'level':
        descriptionParts.push(
          `Explore our curated learning paths designed specifically for ${this.level} learners to enhance their skills and knowledge.`,
        );
        break;
      case 'both':
        descriptionParts.push(
          `Explore our curated learning paths designed specifically for ${this.family}s at the ${this.level} level to improve their skills and knowledge.`,
        );
        break;
    }
    return descriptionParts.join(' ');
  }

  get breadcrumb(): Array<{ label: string; to: string; icon: string }> {
    const crumbs = [
      { label: getTagTitle('learning-paths'), to: '/learning-paths', icon: getTagIcon('learning-paths') },
    ];
    if (this.family) {
      crumbs.push({
        label: this.family.charAt(0).toUpperCase() + this.family.slice(1),
        to: `/learning-paths/for-${this.family}`,
        icon: Icons[this.family],
      });
    }
    if (this.level) {
      crumbs.push({
        label: this.level.charAt(0).toUpperCase() + this.level.slice(1),
        to: `/learning-paths/for-${this.family ? this.family + '-' : ''}${this.level}`,
        icon: Icons[this.level],
      });
    }
    return crumbs;
  }
}
</script>

<script lang="ts" setup>
const route = useRoute();
const routeParam = computed(() => new FamilyOrLevelRoute(route.params.familyAndOrLevel as string));

const allLearningPaths = await useLearningPathsInfo({ family: routeParam.value.family, level: routeParam.value.level });

useSeoMeta({
  title: routeParam.value.title,
  description: routeParam.value.description,
});

const breadcrumb = useLearnBreadcrumb(toRef(routeParam.value.breadcrumb));
</script>

<template>
  <UContainer class="my-8 flex flex-col gap-8 prose-tight">
    <UBreadcrumb v-if="breadcrumb.length" :items="breadcrumb" class="[&_li]:m-0" />

    <UPageHero
      :title="routeParam.title"
      :description="routeParam.subtitle"
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
