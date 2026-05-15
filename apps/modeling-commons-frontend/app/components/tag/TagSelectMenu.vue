<template>
  <USelectMenu
    :ref="selectMenu"
    v-model="selected"
    v-model:search-term="searchTerm"
    placeholder="Tags"
    :items="userMenuItems"
    icon="i-lucide-hash"
    virtualize
    loading-icon="i-lucide-loader"
    multiple
    @update:model-value="
      emit(
        'update:selectedStrings',
        selected.map((t) => t.name),
      )
    "
  >
    <template #empty>
      <UEmpty
        icon="i-lucide-hash"
        title="No tags found"
        description="Try adjusting your search."
        variant="naked"
      />
    </template>
    <template #item-label="{ item }">
      <TagChip v-bind="item" :linkable="false" />
    </template>
  </USelectMenu>
</template>

<script lang="ts">
import { useInfiniteScroll } from "@vueuse/core";
import { areTagsEqual } from "~/forms/tags";
export type TagItem = { label: string; value: string; name: string } & Partial<Tag>;
export const toTagSelectMenuItem = (tag: Partial<Tag> & { name: string }): TagItem => ({
  ...tag,
  label: tag.displayName ?? tag.name,
  value: tag.name,
});
</script>

<script setup lang="ts">
const props = defineProps<{
  tags: Array<Tag>;
  loading: boolean;
  loadNextPage: () => void;
  canLoadMore: boolean;
  canCreateNewTags?: boolean;
}>();

const selected = defineModel<Array<TagItem>>({
  type: Array as () => Array<TagItem>,
  default: () => [],
});
const searchTerm = defineModel<string>("search-term", { type: String, default: "" });
const selectMenu = useTemplateRef("selectMenu");

const emit = defineEmits<{
  "update:selectedStrings": [Array<string>];
}>();

const userMenuItems = computed<TagItem[]>(() => {
  const items: Array<TagItem> = [];
  if (!searchTerm.value && selected.value.length > 0) {
    items.push(...selected.value);
  } else {
    items.push(...props.tags.map(toTagSelectMenuItem));
  }
  if (
    props.canCreateNewTags &&
    searchTerm.value &&
    !props.tags.some((t) => areTagsEqual(t, { name: searchTerm.value }))
  ) {
    items.unshift({
      name: searchTerm.value,
      label: `Create "${searchTerm.value}"`,
      value: searchTerm.value,
    });
  }
  return items;
});

onMounted(() => {
  useInfiniteScroll(
    () => selectMenu.value?.viewportRef,
    () => {
      props.loadNextPage();
    },
    {
      canLoadMore: () => {
        return props.canLoadMore;
      },
    },
  );
});
</script>
