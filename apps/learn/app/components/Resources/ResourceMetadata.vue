<template>
  <div class="flex flex-col gap-[var(--space-sm)] text-sm">
    <div v-if="resource.authors?.length" class="flex gap-2 items-start">
      <span class="font-semibold min-w-24">Authors:</span>
      <div class="flex flex-col gap-1">
        <span v-for="(author, idx) in resource.authors" :key="idx">
          <a
            v-if="author.url"
            :href="author.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:underline"
          >
            {{ author.name }}
          </a>
          <span v-else>{{ author.name }}</span>
        </span>
      </div>
    </div>

    <div v-if="resource.publisher" class="flex gap-2 items-start">
      <span class="font-semibold min-w-24">Publisher:</span>
      <span>{{ resource.publisher }}</span>
    </div>

    <div v-if="resource.yearPublished" class="flex gap-2 items-start">
      <span class="font-semibold min-w-24">Year:</span>
      <span>{{ resource.yearPublished }}</span>
    </div>

    <div v-if="resource.formats?.length" class="flex gap-2 items-start">
      <span class="font-semibold min-w-24">Formats:</span>
      <span class="capitalize">{{ resource.formats.join(', ') }}</span>
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

    <div v-if="resource.languages?.length" class="flex gap-2 items-start">
      <span class="font-semibold min-w-24">Languages:</span>
      <span>{{ resource.languages.join(', ').toUpperCase() }}</span>
    </div>

    <div v-if="resource.isbn || resource.isbn13" class="flex gap-2 items-start">
      <span class="font-semibold min-w-24">ISBN:</span>
      <span>{{ resource.isbn13 || resource.isbn }}</span>
    </div>

    <div v-if="resource.printLength" class="flex gap-2 items-start">
      <span class="font-semibold min-w-24">Pages:</span>
      <span>{{ resource.printLength }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ResourcesCollectionItem } from '@nuxt/content';

type Props = {
  resource: ResourcesCollectionItem;
};

const props = defineProps<Props>();

const pricingColor = computed(() => {
  switch (props.resource.pricing) {
    case 'free':
      return 'success';
    case 'paid':
      return 'warning';
    case 'freemium':
      return 'info';
    default:
      return 'neutral';
  }
});
</script>
