import { toTagSelectMenuItem, type TagItem } from "~/components/tag/TagSelectMenu.vue";

export function useTagsFilter(
  filters: Ref<{ tags?: string[] }>,
  setFilter: (key: "tags", value: string[] | undefined) => void,
) {
  const { prefix: searchTerm, tags, loadNextPage, canLoadMore, pending } = useTags();

  const selected = ref<TagItem[]>([]);

  watch(
    () => filters.value.tags,
    async (tagNames) => {
      if (tagNames?.length) {
        const tagList = await Promise.all(
          tagNames.map(async (name) => {
            const tag = await fetchTagByIdOrName(useApi(), name);
            return toTagSelectMenuItem(tag ?? { displayName: name, name });
          }),
        );
        selected.value = tagList;
      } else {
        selected.value = [];
      }
    },
    { immediate: true },
  );

  watch(selected, (items) => {
    const names = items.map((t) => t.value);
    setFilter("tags", names.length ? names : undefined);
  });

  return {
    selected,
    searchTerm,
    tags,
    loadNextPage,
    canLoadMore,
    pending,
  };
}
