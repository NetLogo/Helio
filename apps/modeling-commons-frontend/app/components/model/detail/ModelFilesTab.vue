<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-lg font-semibold text-highlighted">Attached Files</h3>
      <UButton v-if="editable" variant="outline" icon="i-lucide-plus" size="sm">
        Add Files
      </UButton>
    </div>

    <UStripedTable :data="data" :columns="columns" :loading="loading">
      <template #empty>
        <div class="flex flex-col items-center justify-center py-12 text-dimmed">
          <UIcon name="i-lucide-file" class="size-12 mb-3" />
          <p class="text-sm font-medium">No files attached</p>
          <p class="text-xs mt-1">Additional files for this model will appear here.</p>
        </div>
      </template>

      <template #title-cell="{ cell }">
        <div class="flex items-center">
          <UIcon
            :name="getFileTypeDisplayInfo(cell.getValue() as string).icon"
            class="size-5 text-royal-blue mr-2"
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
  </div>
</template>

<script setup lang="ts">
import { USkeleton } from "#components";
import type { AttachedFile } from "./types";
import type { TableProps } from "@nuxt/ui";

const props = defineProps<{
  files: AttachedFile[];
  editable?: boolean;
  status: "pending" | "error" | "success" | "idle";
}>();

defineEmits<{
  download: [fileId: string];
}>();

const loading = computed(() => props.status === "pending");

type TableData = {
  id: string;
  title: string;
  type: string;
  authorName: string;
  updatedAt: string;
}

type TableColumns = TableProps<TableData>['columns'];

const columns = computed<TableColumns>(() => {
  const baseColumns = [
    { accessorKey: "title", header: "File" },
    { accessorKey: "type", header: "Type" },
    { accessorKey: "authorName", header: "Author" },
    { accessorKey: "updatedAt", header: "Updated" },
    { header: "", id: "actions" },
  ];
  return loading.value ? withSkeleton(baseColumns) : baseColumns;
});

const data = computed(() =>
  loading.value
    ? Array.from({ length: 5 }).map((_, i) => ({
        id: "file-" + i,
        title: "",
        type: "",
        authorName: "",
        updatedAt: new Date().toISOString(),
      }))
    : props.files,
);

const pendingCell = () => {
  return h(USkeleton, { class: "w-full h-4" });
};

const withSkeleton = <T extends TableData>(columns: TableProps<T>['columns']): TableProps<T>['columns'] => {
  return columns?.map((col) => {
    return { ...col, cell: pendingCell };
  });
};
</script>
