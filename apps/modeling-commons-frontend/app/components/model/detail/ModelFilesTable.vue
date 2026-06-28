<template>
  <UStripedTable :data="data" :columns="columns" :loading="loading">
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

    <template #version-cell="{ row }">
      <NuxtLink :to="row.original.versionUrl" :title="`Open version ${row.original.taggedVersionNumber}`">
        <UBadge color="neutral" variant="soft" size="sm" class="cursor-pointer hover:underline">
          v{{ row.original.taggedVersionNumber }}
        </UBadge>
      </NuxtLink>
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
</template>

<script setup lang="ts">
import { USkeleton } from "#components";
import type { AttachedFile } from "./types";
import type { TableProps } from "@nuxt/ui";

const props = defineProps<{
  files: AttachedFile[];
  loading?: boolean;
  showVersion?: boolean;
}>();

defineEmits<{
  download: [fileId: string];
}>();

type TableData = {
  id: string;
  title: string;
  type: string;
  taggedVersionNumber: number;
  authorName: string;
  updatedAt: string;
  versionUrl?: string;
};

type TableColumns = TableProps<TableData>["columns"];

const columns = computed<TableColumns>(() => {
  const baseColumns = [
    { accessorKey: "title", header: "File" },
    { accessorKey: "type", header: "Type" },
    ...(props.showVersion ? [{ header: "Version", id: "version" }] : []),
    { accessorKey: "authorName", header: "Author" },
    { accessorKey: "updatedAt", header: "Updated" },
    { header: "", id: "actions" },
  ];
  return props.loading ? withSkeleton(baseColumns) : baseColumns;
});

const data = computed<TableData[]>(() =>
  props.loading
    ? Array.from({ length: 3 }).map((_, i) => ({
        id: "file-" + i,
        title: "",
        type: "",
        taggedVersionNumber: 0,
        authorName: "",
        updatedAt: new Date().toISOString(),
      }))
    : props.files,
);

const pendingCell = () => h(USkeleton, { class: "w-full h-4" });

const withSkeleton = <T extends TableData>(
  columns: TableProps<T>["columns"],
): TableProps<T>["columns"] => columns?.map((col) => ({ ...col, cell: pendingCell }));
</script>
