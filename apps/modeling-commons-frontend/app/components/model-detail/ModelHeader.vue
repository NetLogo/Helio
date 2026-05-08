<template>
  <header class="space-y-6">
    <div class="flex items-start justify-between gap-4 mb-1">
      <h5 class="text-highlighted m-0">
        {{ title }}
      </h5>
      <div class="flex items-center gap-3 shrink-0">
        <ModelEmbedButton
          :title="title"
          :download-url="downloadUrl"
          :embed-url="downloadUrl ? getNetlogoWebEmbedUrl(downloadUrl, title) : undefined"
          :authors="authors"
          :relative-date="relativeDate"
          :netlogo-version="netlogoVersion"
          :model-group="modelGroup"
          :model-visibility="modelVisibility"
          :preview-image-url="previewImageUrl"
        />
        <UButton
          v-if="downloadUrl"
          icon="i-lucide-download"
          :to="downloadUrl"
          external
          size="sm"
          @click="$emit('download')"
        >
          Download
        </UButton>
      </div>
    </div>

    <div class="flex items-center gap-2 text-sm text-muted flex-wrap">
      <ModelAuthors v-if="authors.length > 0" :authors="authors" />
      <Middot v-if="authors.length > 0" />
      <span>{{ relativeDate }}</span>
      <Middot v-if="modelVisibility" />
      <span class="flex items-center gap-1">
        <UIcon :name="visibility.icon" />
        {{ visibility.label }}
      </span>
      <template v-if="netlogoVersion">
        <Middot v-if="authors.length > 0" />
        <span>Written in {{ netlogoVersion }}</span>
      </template>
      <template v-if="modelGroup">
        <Middot v-if="authors.length > 0" />
        <span>
          Model Group:
          <NuxtLink class="font-medium text-primary-700 hover:underline">{{ modelGroup }}</NuxtLink>
        </span>
      </template>
    </div>
  </header>
</template>

<script setup lang="ts">
import { formatRelativeDate } from "~/utils/formatters";
import type { Author } from "../ModelAuthors.vue";

const props = defineProps<{
  title: string;
  authors: Array<Author>;
  createdAt: string;
  netlogoVersion?: string | null;
  modelGroup?: string | null;
  downloadUrl?: string | null;
  modelVisibility?: string;
  previewImageUrl?: string | null;
}>();

defineEmits<{
  embed: [];
  download: [];
}>();

const relativeDate = computed(() => formatRelativeDate(props.createdAt));
const visibility = getModelVisibilityDisplayInfo(props.modelVisibility || "");
</script>
