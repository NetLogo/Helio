<template>
  <UContainer class="my-[var(--block-top)] px-[var(--space-xl)] lg:px-0 nl-container-width mx-auto">
    <UBreadcrumb :items="crumb" class="no-stylized-heading" />

    <article class="flex flex-col gap-[var(--space-lg)]">
      <div class="grid lg:grid-cols-3 gap-[var(--space-lg)] items-start mt-[var(--block-top)]">
        <div class="lg:col-span-1">
          <img
            :src="resource.thumbnail?.url ?? '/images/default-thumbnail.png'"
            :alt="resource.thumbnail?.alt ?? `${resource.title} ${imageLabel}`"
            class="w-full rounded-lg shadow-lg"
          />
          <span class="text-xs text-gray-500 italic mt-1">
            {{ resource.thumbnail?.caption ?? resource.thumbnail?.alt }}
          </span>
        </div>

        <div class="lg:col-span-2 flex flex-col gap-[var(--space-md)]">
          <div>
            <UBadge v-if="badgeText" :class="badgeClass" class="mb-2">
              {{ badgeText }}
            </UBadge>
            <h1 class="text-4xl font-bold mt-0 mb-[var(--space-sm)] no-stylized-heading">
              {{ resource.fullName || resource.title }}
            </h1>
            <p v-if="resource.shortName && resource.shortName !== resource.title" class="text-lg text-gray-600 italic">
              ({{ resource.shortName }})
            </p>
          </div>

          <p class="text-lg leading-relaxed">{{ resource.description }}</p>

          <div class="flex gap-3">
            <Button as-child variant="default" size="lg">
              <a :href="resource.url" target="_blank" rel="noopener noreferrer">
                <Icon :name="buttonIcon" class="w-4 h-4" />
                {{ buttonText }}
              </a>
            </Button>
          </div>

          <div class="bg-gray-50 border border-gray-200 rounded-lg p-[var(--space-lg)] mt-[var(--space-sm)]">
            <slot name="metadata">
              <ResourceMetadata :resource="resource" />
            </slot>
          </div>
        </div>
      </div>

      <section v-if="resource.longDescription" class="prose prose-medium max-w-none mb-0">
        <h2 class="no-stylized-heading">{{ longDescriptionTitle }}</h2>
        <MDC :value="resource.longDescription" class="mb-0" />
      </section>

      <slot name="content" />

      <section v-if="resource.citation" class="bg-gray-50 border-l-4 border-primary p-[var(--space-lg)] rounded">
        <h3 class="text-lg font-semibold mt-0 mb-[var(--space-sm)] no-stylized-heading">Citation</h3>
        <p class="font-mono text-sm whitespace-pre-wrap m-0">{{ resource.citation }}</p>
      </section>

      <section v-if="resource.containsModels" class="bg-blue-50 border border-blue-200 p-[var(--space-lg)] rounded">
        <div class="flex gap-3 items-center">
          <Icon name="i-lucide-box" class="w-6 h-6 text-blue-600" />
          <div>
            <h3 class="text-lg font-semibold mt-0 mb-1 no-stylized-heading">Contains NetLogo Models</h3>
            <p class="text-sm text-gray-700 m-0">{{ containsModelsText }}</p>
          </div>
        </div>
      </section>

      <section v-if="resource.netLogoVersion" class="flex gap-2 items-center text-sm text-gray-600">
        <Icon name="i-lucide-info" class="w-4 h-4" />
        <span>Compatible with NetLogo {{ resource.netLogoVersion }}</span>
      </section>
    </article>
  </UContainer>
</template>

<script setup lang="ts">
import type { ResourcesCollectionItem } from '@nuxt/content';

type Props = {
  resource: ResourcesCollectionItem;
  imageLabel?: string;
  buttonText?: string;
  buttonIcon?: string;
  longDescriptionTitle?: string;
  containsModelsText?: string;
};

const props = withDefaults(defineProps<Props>(), {
  imageLabel: 'thumbnail',
  buttonText: 'View Resource',
  buttonIcon: 'i-lucide-external-link',
  longDescriptionTitle: 'About This Resource',
  containsModelsText: 'This resource includes NetLogo model files and examples.',
});

const { badgeText, badgeClass } = useResourceHelpers(toRef(props, 'resource'));
const crumb = useResourceBreadcrumb(props.resource);
</script>
