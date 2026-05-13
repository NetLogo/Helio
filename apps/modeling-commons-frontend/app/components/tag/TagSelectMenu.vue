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
}>();

const userMenuItems = computed<TagItem[]>(() => {
  if (!searchTerm.value && selected.value.length > 0) {
    return selected.value;
  }
  return props.tags.map(toTagSelectMenuItem);
});

const selected = defineModel<Array<TagItem>>({
  type: Array as () => Array<TagItem>,
  default: () => [],
});
const searchTerm = defineModel<string>("search-term", { type: String, default: "" });
const selectMenu = useTemplateRef("selectMenu");

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
