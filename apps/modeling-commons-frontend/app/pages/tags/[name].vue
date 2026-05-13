<template>
  <UContainer>
    <ModelsListing :filters="filters">
      <template #header>
        <div v-if="tagStatus === 'pending'" class="space-y-2">
          <div class="h-8 w-48 bg-accented rounded animate-pulse" />
          <div class="h-4 w-64 bg-muted rounded animate-pulse" />
        </div>

        <UError v-else-if="tagError" :error="tagError" />

        <div v-else-if="tag" class="space-y-2">
          <div class="flex items-center gap-3 flex-wrap">
            <TagChip :name="tag.name" :display-name="tag.displayName" :linkable="false" />
            <h4 class="tracking-tight">{{ tag.displayName }}</h4>
          </div>
          <p class="text-sm text-muted">
            Models tagged with <span class="font-medium">{{ tag.displayName }}</span>
          </p>
        </div>
      </template>
    </ModelsListing>
  </UContainer>
</template>

<script setup lang="ts">
import type { ModelsFilters } from "~/forms/models";

const route = useRoute();
const api = useApi();

const name = computed(() => decodeURIComponent(route.params.name as string));

const {
  data: tag,
  error: tagError,
  status: tagStatus,
} = await useAsyncData(
  () => `tag-${name.value}`,
  () => fetchTagByIdOrName(api, name.value),
  { watch: [name] },
);

if (tagError.value) {
  showError(tagError.value);
}

useSeoMeta({
  title: computed(() => (tag.value ? `Models tagged "${tag.value.displayName}"` : "Tag")),
  description: computed(() =>
    tag.value
      ? `Browse NetLogo models tagged with ${tag.value.displayName}.`
      : "Browse models by tag.",
  ),
});

const filters = computed<ModelsFilters>(() => ({ tags: [name.value] }));
</script>
