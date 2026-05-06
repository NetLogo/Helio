<template>
  <UTable
    ref="table"
    :data="models"
    :columns="
      [
        { header: 'Model Name', id: 'title', meta: {
            class: { th: 'w-140', }
        }},
        { header: 'Author(s)', id: 'authors', meta: {
            class: { th: 'w-40', }
        }},
        { header: 'Tags', accessorKey: 'tagsOnLatestVersion', meta: {
          class: { th: 'w-40' },
        } },
        { header: 'Modified', id: 'modified', accessorKey: 'model.updatedAt' },
        { header: 'Created', id: 'created', accessorKey: 'model.createdAt' },
      ] as const
    "
    :loading="loading"
    sticky
    class="flex-1 max-h-[70vh]"
  >
    <template #title-cell="{ row }">
      <NuxtLink
        :to="getModelPath(row.original)"
        aria-label="View model details"
      >
        <div class="flex gap-5 items-center group/card cursor-pointer relative" @click="navigateTo(getModelPath(row.original))">
          <div class="h-12 w-12 shrink-0 overflow-hidden rounded">
            <ModelCardPreviewImage
              :src="getImageSrc(row.original)"
              :alt="getTitle(row.original)"
            />
          </div>
          <span
            class="max-w-100 text-[1rem] font-semibold text-black line-clamp-2 leading-tight overflow-hidden text-ellipsis transition-colors group-hover/card:text-royal-blue whitespace-break-spaces"
          >
            {{ getTitle(row.original) }}
          </span>
        </div>
      </NuxtLink>
    </template>

    <template #authors-cell="{ row }">
      <div class="flex gap-2 flex-wrap w-40">
        <span
          v-for="(author, index) in getAuthors(row.original)"
          :key="index"
          class="text-sm text-toned underline whitespace-break-spaces"
        >
          {{ author.name }}<span v-if="index < getAuthors(row.original).length - 1">, </span>
        </span>
      </div>
    </template>

    <template #tagsOnLatestVersion-cell="{ row }">
        <TagList v-if="getTags(row.original).length > 0" :tags="getTags(row.original).slice(0, 9)" />
      <span v-else class="text-sm text-toned">–</span>
    </template>

    <template #modified-cell="{ getValue }">
      {{ formatRelativeDate(getValue<string>()) }}
    </template>

    <template #created-cell="{ getValue }">
      {{ formatRelativeDate(getValue<string>()) }}
    </template>

    <template #empty>
        <div class="flex flex-col items-center justify-center py-20 mx-auto">
          <UIcon name="i-lucide-inbox" class="size-14 text-dimmed mx-auto mb-4" />
          <h2 class="text-lg font-semibold text-toned">No models found</h2>
          <p class="text-dimmed mt-1">Try adjusting your search or filters.</p>
          <UButton variant="outline" class="mt-4" @click="emit('resetFilters')"> Clear filters </UButton>
        </div>
    </template>
  </UTable>
</template>

<script setup lang="ts">
import type { UserProps } from "#ui/types";
import { useInfiniteScroll } from "@vueuse/core";
import type { ModelCard } from "~/composables/useModelCard";

const props = defineProps<{
  models: Array<ModelCard>;
  loading: boolean;
  canLoadMore: boolean;
}>();

const emit = defineEmits<{
resetFilters: [];
onLoadMore: [];
}>();

const table = useTemplateRef("table");

const getTitle = (card: ModelCard) => card.latestVersion?.title || "Untitled Model";
const getImageSrc = (card: ModelCard) =>
  card.previewImageUrl ? appendWindowProtocol(card.previewImageUrl) : undefined;

const getAuthors = (card: ModelCard): UserProps[] =>
  card.authors.map((a) => ({
    name: a.userName ?? undefined,
    avatar: { alt: a.userName ?? undefined },
  }));

const getTags = (card: ModelCard) => card.tagsOnLatestVersion;
const getModelPath = (card: ModelCard) => createModelPath(card.model.id, card.latestVersion?.title ?? "Untitled Model");


onMounted(() => {
  useInfiniteScroll(
    table.value?.$el,
    () => {
      emit('onLoadMore');
    },
    {
      distance: 20,
      canLoadMore: () => {
        return props.canLoadMore;
      },
    },
  );
});
</script>
