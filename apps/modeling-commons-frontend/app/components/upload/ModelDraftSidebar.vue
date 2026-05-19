<template>
  <div
    data-show-from="lg"
    class="flex-col flex-0 gap-5 sticky top-[calc(1.5rem+var(--ui-header-height))] self-start min-w-60"
  >
    <ModelDraftNetlogoFileCard
      v-model:picked-file="pickedFile"
      :current-file-name="currentFileName"
    />

    <USeparator />

    <h6>Upload Preview</h6>
    <ModelCard v-if="hasPrimaryFile" class="w-60 h-fit" :card="previewCard" />
  </div>
</template>

<script setup lang="ts">
import type { ModelCard as ModelCardType } from "~/composables/model/useModelCard";

defineProps<{
  currentFileName: string | null;
  hasPrimaryFile: boolean;
  previewCard: ModelCardType;
}>();

const pickedFile = defineModel<File | null>("pickedFile", { default: null });
</script>
