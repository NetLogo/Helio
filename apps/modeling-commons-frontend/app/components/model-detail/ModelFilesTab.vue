<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-lg font-semibold text-slate-900">Attached Files</h3>
      <UButton v-if="editable" variant="outline" icon="i-lucide-plus" size="sm">
        Add Files
      </UButton>
    </div>

    <table v-if="files.length > 0" class="w-full text-sm">
      <thead>
        <tr class="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <th class="pb-3 pr-4">Title</th>
          <th class="pb-3 pr-4">Description</th>
          <th class="pb-3 pr-4">Type</th>
          <th class="pb-3 pr-4">Author</th>
          <th class="pb-3 pr-4">Updated</th>
          <th class="pb-3 w-10" />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="file in files"
          :key="file.id"
          class="border-b border-slate-100"
          :class="file.isPending ? 'bg-amber-50/50' : ''"
        >
          <td class="py-3 pr-4 font-medium text-slate-700">
            <span v-if="!file.isPending">
              <UIcon name="i-lucide-check" class="size-3 text-emerald-500 mr-1" />
            </span>
            <span v-else class="text-amber-600 mr-1">*</span>
            {{ file.title }}
          </td>
          <td class="py-3 pr-4 text-slate-500 truncate max-w-48">{{ file.description }}</td>
          <td class="py-3 pr-4 text-slate-500">{{ file.type }}</td>
          <td class="py-3 pr-4">
            <NuxtLink class="text-blue-700 hover:underline">{{ file.authorName }}</NuxtLink>
          </td>
          <td class="py-3 pr-4 text-slate-500">{{ file.updatedAt }}</td>
          <td class="py-3">
            <UButton
              variant="ghost"
              icon="i-lucide-download"
              size="xs"
              square
              @click="$emit('download', file.id)"
            />
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else class="flex flex-col items-center justify-center py-12 text-slate-400">
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
