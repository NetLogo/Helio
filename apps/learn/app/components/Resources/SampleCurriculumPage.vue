<template>
  <ResourcePageBase
    :resource="resource"
    button-text="Access Curriculum"
    long-description-title="About This Curriculum"
    contains-models-text="This curriculum includes NetLogo model files and examples."
  >
    <template #metadata>
      <div class="flex flex-col gap-(--space-sm) text-sm">
        <div v-if="resource.gradeLevels?.length" class="flex gap-2 items-start">
          <span class="font-semibold min-w-24">Grade Levels:</span>
          <div class="flex gap-2 flex-wrap">
            <UBadge v-for="grade in resource.gradeLevels" :key="grade" variant="outline">
              {{ grade }}
            </UBadge>
          </div>
        </div>

        <div v-if="resource.subjectAreas?.length" class="flex gap-2 items-start">
          <span class="font-semibold min-w-24">Subject Areas:</span>
          <span>{{ resource.subjectAreas.join(', ') }}</span>
        </div>

        <div v-if="resource.curriculumDurationHours" class="flex gap-2 items-start">
          <span class="font-semibold min-w-24">Duration:</span>
          <span>{{ resource.curriculumDurationHours }} hours</span>
        </div>

        <div v-if="resource.curriculumMaterialsIncluded?.length" class="flex gap-2 items-start">
          <span class="font-semibold min-w-24">Materials:</span>
          <div class="flex gap-2 flex-wrap">
            <UBadge v-for="material in resource.curriculumMaterialsIncluded" :key="material" variant="soft">
              {{ material }}
            </UBadge>
          </div>
        </div>

        <div v-if="resource.pricing" class="flex gap-2 items-start">
          <span class="font-semibold min-w-24">Pricing:</span>
          <UBadge :color="pricingColor" class="capitalize">{{ resource.pricing }}</UBadge>
        </div>

        <div v-if="resource.level?.length" class="flex gap-2 items-start">
          <span class="font-semibold min-w-24">Level:</span>
          <div class="flex gap-2 flex-wrap">
            <UBadge v-for="level in resource.level" :key="level" variant="outline" class="capitalize">
              {{ level }}
            </UBadge>
          </div>
        </div>

        <div v-if="resource.targetAudience?.length" class="flex gap-2 items-start">
          <span class="font-semibold min-w-24">Audience:</span>
          <div class="flex gap-2 flex-wrap">
            <UBadge v-for="audience in resource.targetAudience" :key="audience" variant="outline" class="capitalize">
              {{ audience }}
            </UBadge>
          </div>
        </div>
      </div>
    </template>

    <template #content>
      <section
        v-if="resource.curriculumStandards?.length"
        class="bg-blue-50 border border-blue-200 p-(--space-lg) rounded"
      >
        <h3 class="text-lg font-semibold mt-0 mb-(--space-sm) no-stylized-heading">Educational Standards</h3>
        <ul class="list-disc pl-5 space-y-1 m-0">
          <li v-for="standard in resource.curriculumStandards" :key="standard">{{ standard }}</li>
        </ul>
      </section>
    </template>
  </ResourcePageBase>
</template>

<script setup lang="ts">
import type { ResourcesCollectionItem } from '@nuxt/content';

type Props = {
  resource: ResourcesCollectionItem;
};

const props = defineProps<Props>();

const { pricingColor } = useResourceHelpers(toRef(props, 'resource'));
</script>
