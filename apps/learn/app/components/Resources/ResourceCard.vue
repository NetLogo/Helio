<template>
  <UBlogPost
    :title="resource.title"
    :description="resource.description"
    :image="resource.thumbnail?.url ?? '/images/default-thumbnail.png'"
    :badge="badgeText!"
    variant="outline"
    :to="addLeadingSlash(resource.stem)"
    :ui="{
      title: 'my-3',
      badge: badgeClass,
    }"
  >
    <template v-if="showMetadata" #footer>
      <span class="flex gap-1 items-center text-xs text-gray-600 italic">
        <Icon :name="kind.icon" class="w-3 h-3 inline-block align-middle text-gray-400" />
        {{ kind.label }}
      </span>
      <div class="flex gap-2 flex-wrap text-xs text-gray-600 mt-2">
        <span v-if="resource.yearPublished">{{ resource.yearPublished }}</span>
        <span v-if="resource.authors?.length" class="flex gap-1">
          <Icon name="i-lucide-user" class="w-3 h-3" />
          {{ resource.authors[0]?.name }}
          <span v-if="resource.authors.length > 1">et al.</span>
        </span>
        <UBadge v-if="resource.pricing" :color="pricingColor" size="xs" class="capitalize">
          {{ resource.pricing }}
        </UBadge>
      </div>
    </template>
  </UBlogPost>
</template>

<script setup lang="ts">
import type { ResourcesCollectionItem } from '@nuxt/content';

type Props = {
  resource: ResourcesCollectionItem;
  showMetadata?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  showMetadata: true,
});

const { badgeText, badgeClass, kind } = useResourceHelpers(toRef(props, 'resource'));

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
