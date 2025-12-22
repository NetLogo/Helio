<template>
  <ResourcePageBase
    :resource="resource"
    button-text="Download Dataset"
    button-icon="i-lucide-download"
    long-description-title="About This Dataset"
    contains-models-text="This dataset includes NetLogo model files and examples."
  >
    <template #metadata>
      <div class="flex flex-col gap-[var(--space-sm)] text-sm">
        <div v-if="resource.datasetSizeKB" class="flex gap-2 items-start">
          <span class="font-semibold min-w-24">Size:</span>
          <span>{{ formatSize(resource.datasetSizeKB) }}</span>
        </div>

        <div v-if="resource.datasetFormats?.length" class="flex gap-2 items-start">
          <span class="font-semibold min-w-24">Formats:</span>
          <div class="flex gap-2 flex-wrap">
            <UBadge v-for="format in resource.datasetFormats" :key="format" variant="soft" class="uppercase">
              {{ format }}
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

        <div v-if="resource.yearPublished" class="flex gap-2 items-start">
          <span class="font-semibold min-w-24">Year:</span>
          <span>{{ resource.yearPublished }}</span>
        </div>
      </div>
    </template>

    <template #content>
      <section v-if="resource.datasetContents">
        <h2 class="text-2xl font-bold mb-[var(--space-md)] no-stylized-heading">Dataset Contents</h2>
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-[var(--space-lg)]">
          <DatasetFileTree :node="resource.datasetContents as unknown as FileTreeNode" />
        </div>
      </section>
    </template>
  </ResourcePageBase>
</template>

<script setup lang="ts">
import type { ResourcesCollectionItem } from '@nuxt/content';
import type { FileTreeNode } from './DatasetFileTree.vue';

type Props = {
  resource: ResourcesCollectionItem;
};

const props = defineProps<Props>();

const { pricingColor, formatSize } = useResourceHelpers(toRef(props, 'resource'));
</script>
