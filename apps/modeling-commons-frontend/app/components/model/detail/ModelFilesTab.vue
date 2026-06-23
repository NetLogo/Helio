<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-lg font-semibold text-highlighted">Attached Files</h3>
      <UButton v-if="editable" variant="outline" icon="i-lucide-plus" size="sm">
        Add Files
      </UButton>
    </div>

    <ModelFilesTable v-if="loading" :files="[]" loading />

    <div
      v-else-if="modelFiles.length === 0 && additionalFiles.length === 0"
      class="flex flex-col items-center justify-center py-12 text-dimmed"
    >
      <UIcon name="i-lucide-file" class="size-12 mb-3" />
      <p class="text-sm font-medium">No files attached</p>
      <p class="text-xs mt-1">Model and additional files for this model will appear here.</p>
    </div>

    <div v-else class="flex flex-col gap-8">
      <section v-if="modelFiles.length">
        <h4 class="text-sm font-semibold text-highlighted mb-2">Model Files</h4>
        <ModelFilesTable :files="modelFiles" @download="$emit('download', $event)" />
      </section>

      <section v-if="additionalFiles.length">
        <h4 class="text-sm font-semibold text-highlighted mb-2">Additional Files</h4>
        <ModelFilesTable :files="additionalFiles" show-version @download="$emit('download', $event)" />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AttachedFile } from "./types";

const props = defineProps<{
  files: AttachedFile[];
  editable?: boolean;
  status: "pending" | "error" | "success" | "idle";
  viewedVersionNumber?: number | null;
}>();

defineEmits<{
  download: [fileId: string];
}>();

const loading = computed(() => props.status === "pending");
const modelFiles = computed(() =>
  props.files.filter(
    (f) =>
      f.kind === "model" &&
      (props.viewedVersionNumber == null ||
        f.taggedVersionNumber === props.viewedVersionNumber),
  ),
);
const additionalFiles = computed(() => props.files.filter((f) => f.kind === "additional"));
</script>
