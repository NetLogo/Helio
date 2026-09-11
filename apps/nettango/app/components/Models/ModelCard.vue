<template>
  <UBlogPost
    :title="model.title"
    :description="model.description"
    :to="`/models/${model.id}`"
    variant="outline"
    class="h-full transition-transform duration-300 hover:scale-[1.02]"
    :ui="{
      header: 'aspect-square',
      body: 'flex flex-col gap-2',
      description: 'line-clamp-3',
      footer: 'relative z-10 mt-auto',
    }"
  >
    <template #header>
      <ModelThumbnail :model="model" />
    </template>

    <template #badge>
      <div class="flex flex-wrap gap-1">
        <UBadge v-for="tag in model.tags" :key="tag" :label="tag" variant="subtle" size="sm" />
      </div>
    </template>

    <template #authors>
      <p class="text-xs text-muted">By {{ authorList }}</p>
    </template>

    <template #footer>
      <div class="flex flex-wrap gap-2">
        <UButton :to="`/models/${model.id}`" size="sm" icon="i-lucide-play" label="Run model" />
        <UButton
          :to="editorUrl"
          external
          target="_blank"
          size="sm"
          variant="subtle"
          icon="i-lucide-pencil"
          label="Edit"
        />
        <UButton
          :to="model.project"
          external
          download
          size="sm"
          variant="ghost"
          color="neutral"
          icon="i-lucide-download"
          label="Project file"
        />
      </div>
    </template>
  </UBlogPost>
</template>

<script setup lang="ts">
import type { GalleryModel } from "~/composables/useModels";

const props = defineProps<{ model: GalleryModel }>();

const editorUrl = useModelEditorUrl(props.model);
const authorList = computed(() => new Intl.ListFormat("en").format(props.model.authors));
</script>
