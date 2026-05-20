<template>
  <div>
    <div class="flex items-baseline justify-between mb-6">
      <span />
      <UButton
        to="/models/upload"
        icon="i-lucide-file-plus"
        color="primary"
        variant="outline"
        label="Start new"
      />
    </div>

    <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <BaseCard v-for="i in 4" :key="i" class="h-40 animate-pulse" />
    </div>

    <div v-else-if="error" class="text-center py-16">
      <UIcon name="i-lucide-circle-alert" class="size-10 text-dimmed mx-auto mb-3" />
      <p class="text-muted">{{ error.message }}</p>
      <UButton variant="outline" class="mt-3" @click="refresh()">Try again</UButton>
    </div>

    <UTable
      :data="drafts"
      :columns="[
        {
          accessorKey: 'data.title',
          header: 'Model',
          id: 'title',
          meta: {
            class: {
              td: 'max-w-20 md:max-w-50 truncate',
            },
          },
        },
        {
          accessorKey: 'data.description',
          header: 'Description',
          cell: ({ getValue }) => getValue() || defaultStrings.modelDescription,
          meta: {
            class: {
              td: 'max-w-20 md:max-w-50 truncate',
            },
          },
        },
        {
          accessorKey: 'updatedAt',
          header: 'Last Edited',
          cell: ({ getValue }) => {
            const d = new Date(getValue() as string);
            return d.toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            });
          },
        },
        {
          id: 'actions',
          header: '',
          meta: {
            class: {
              td: 'text-right',
            },
          },
        },
      ]"
    >
      <template #empty>
        <div class="text-center py-20">
          <UIcon name="i-lucide-file-plus" class="size-12 text-dimmed mx-auto mb-3" />
          <h2 class="text-lg font-medium">No drafts yet</h2>
          <p class="text-muted mt-1">
            Start uploading a model and we'll save your progress automatically.
          </p>
          <UButton to="/models/upload" class="mt-4" color="primary"> Upload a model </UButton>
        </div>
      </template>
      <template #title-cell="{ row }">
        <div class="flex gap-5 items-center cursor-pointer relative">
          <div class="h-12 w-12 shrink-0 overflow-hidden rounded">
            <ModelCardPreviewImage
              :src="row.original.previewImageUrl"
              :alt="`Preview of ${row.original.data.title || 'Untitled model'}`"
            />
          </div>
          <span
            class="max-w-100 text-[1rem] font-semibold text-black line-clamp-2 leading-tight overflow-hidden text-ellipsis transition-colors whitespace-break-spaces"
          >
            {{ row.original.data.title || "Untitled Model" }}
          </span>
        </div>
      </template>

      <template #actions-cell="{ row }">
        <UDropdownMenu
          :content="{ align: 'end' }"
          aria-label="actions-dropdown"
          :items="[
            { type: 'label', label: 'Actions' },
            {
              label: 'Resume editing',
              to: `/models/upload?draft=${row.original.id}`,
              as: 'button',
              icon: 'i-lucide-square-pen',
              type: 'link',
            },
            {
              label: 'Delete',
              icon: 'i-lucide-trash-2',
              color: 'error',
              onClick: () => onDelete(row.original.id),
            },
          ]"
        >
          <UButton variant="ghost" icon="i-lucide-more-vertical" size="xs" square />
        </UDropdownMenu>
      </template>
    </UTable>
  </div>
</template>

<script setup lang="ts">
import type { ModelDraftDto } from "~/composables/model/useModelDraft";

definePageMeta({
  layout: "profile",
  middleware: ["auth"],
});

useSeoMeta({
  title: "My Drafts",
  description: "Your in-progress model uploads",
});

interface DraftsListResponse {
  count: number;
  limit: number;
  page: number;
  data: ModelDraftDto[];
}

const apiBase = useRuntimeConfig().public.apiBase as string;
const toast = useToast();

const { data, pending, error, refresh } = await useAsyncData("my-drafts", async () => {
  const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
  const res = await $fetch<DraftsListResponse>(`${apiBase}/api/v1/model-drafts`, {
    credentials: "include",
    headers,
  });
  return res;
});

const drafts = computed(() => data.value?.data ?? []);
const deletingId = ref<string | null>(null);

async function onDelete(id: string) {
  deletingId.value = id;
  try {
    const res = await fetch(`${apiBase}/api/v1/model-drafts/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    await refresh();
    toast.add({
      title: "Draft deleted",
      icon: "i-lucide-trash-2",
      color: "neutral",
    });
  } catch (err) {
    toast.add({
      title: "Delete failed",
      description: err instanceof Error ? err.message : "Something went wrong.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  } finally {
    deletingId.value = null;
  }
}
</script>
