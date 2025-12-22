<template>
  <ResourcePageBase
    :resource="resource"
    button-text="View Extension"
    long-description-title="About This Extension"
    :contains-models-text="`This ${kindLabel} includes NetLogo model files and examples.`"
  >
    <template #metadata>
      <div class="flex flex-col gap-[var(--space-sm)] text-sm">
        <div v-if="resource.softwareResourceKind" class="flex gap-2 items-start">
          <span class="font-semibold min-w-24">Type:</span>
          <UBadge variant="soft" class="capitalize">{{ resource.softwareResourceKind }}</UBadge>
        </div>

        <div v-if="resource.compatibleWith?.length" class="flex gap-2 items-start">
          <span class="font-semibold min-w-24">Compatible:</span>
          <div class="flex gap-2 flex-wrap">
            <UBadge v-for="version in resource.compatibleWith" :key="version" variant="outline">
              {{ version }}
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

        <div v-if="resource.languages?.length" class="flex gap-2 items-start">
          <span class="font-semibold min-w-24">Languages:</span>
          <span>{{ resource.languages.join(', ').toUpperCase() }}</span>
        </div>
      </div>
    </template>

    <template #content>
      <section v-if="resource.screenshots?.length" class="mt-[var(--block-top)]">
        <h2 class="text-2xl font-bold mb-[var(--space-md)] no-stylized-heading">Screenshots</h2>
        <UCarousel
          v-slot="{ item }"
          :items="resource.screenshots"
          class="w-full mx-auto"
          wheel-gestures
          arrows
          :ui="{ item: `basis-1/${Math.min(resource.screenshots.length, 3)}` }"
        >
          <img
            :src="item.url"
            :alt="item.alt ?? `${resource.title} screenshot`"
            class="object-fit shrink-1 grow-0 h-[400px] rounded-lg border border-gray-200 shadow-sm hover:shadow-xl transition-shadow"
          />
        </UCarousel>
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

const kindLabel = computed(() => {
  return props.resource.softwareResourceKind || 'software resource';
});
</script>
