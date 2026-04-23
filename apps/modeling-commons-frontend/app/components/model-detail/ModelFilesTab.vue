<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-lg font-semibold text-highlighted">Attached Files</h3>
      <UButton v-if="editable" variant="outline" icon="i-lucide-plus" size="sm">
        Add Files
      </UButton>
    </div>

    <UStripedTable
      v-if="files.length > 0"
      :data="files"
      :columns="[
        { accessorKey: 'title', header: 'File' },
        { accessorKey: 'type', header: 'Type' },
        { accessorKey: 'authorName', header: 'Author' },
        { accessorKey: 'updatedAt', header: 'Updated' },
        { header: '', id: 'actions' },
      ]"
    >
      <template #title-cell="{ cell }">
        <div class="flex items-center">
          <UIcon
            :name="getFileTypeDisplayInfo(cell.getValue() as string).icon"
            class="size-4 text-muted mr-2"
          />
          <span>{{ cell.getValue() }}</span>
        </div>
      </template>

      <template #type-cell="{ row }">
        <span>{{ getFileTypeDisplayInfo(row.original.title).label }}</span>
      </template>

      <template #authorName-cell="{ cell }">
        <NuxtLink class="text-primary-700 hover:underline">{{ cell.getValue() }}</NuxtLink>
      </template>

      <template #actions-cell="{ row }">
        <UButton
          variant="ghost"
          icon="i-lucide-download"
          size="xs"
          square
          @click="$emit('download', row.original.id)"
        />
      </template>
    </UStripedTable>

    <div v-else class="flex flex-col items-center justify-center py-12 text-dimmed">
      <UIcon name="i-lucide-file" class="size-12 mb-3" />
      <p class="text-sm font-medium">No files attached</p>
      <p class="text-xs mt-1">Additional files for this model will appear here.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AttachedFile } from "./types";

defineProps<{
  files: AttachedFile[];
  editable?: boolean;
}>();

defineEmits<{
  download: [fileId: string];
}>();
</script>
