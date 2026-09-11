<template>
  <header
    class="flex flex-col gap-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5"
  >
    <div class="w-full shrink-0 overflow-hidden rounded-xl hidden sm:block sm:w-48">
      <ModelThumbnail :model="model" />
    </div>

    <div class="flex min-w-0 flex-1 flex-col gap-3">
      <div class="flex flex-wrap gap-1">
        <UBadge v-for="tag in model.tags" :key="tag" :label="tag" variant="subtle" size="sm" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">{{ model.title }}</h1>
        <p class="mt-1 text-sm text-gray-500">By {{ authorList }}</p>
      </div>
      <p class="max-w-2xl text-sm text-gray-600 line-clamp-3 min-h-[2lh] max-h-[3lh]" :title="model.description">{{ model.description }}</p>
      <div class="flex flex-wrap gap-2">
        <UButton
          :to="editorUrl"
          external
          target="_blank"
          size="sm"
          icon="i-lucide-pencil"
          trailing-icon="i-lucide-arrow-up-right"
          label="Open in Builder"
        />
        <UButton
          :to="model.project"
          external
          download
          size="sm"
          variant="subtle"
          color="neutral"
          icon="i-lucide-download"
          label="Download project file"
        />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { GalleryModel } from "~/composables/useModels";

const props = defineProps<{ model: GalleryModel }>();

const editorUrl = useModelEditorUrl(props.model);
const authorList = computed(() => new Intl.ListFormat("en").format(props.model.authors));
</script>
