interface UseModelsOptions {
  filters: Ref<ModelsFilters> | ComputedRef<ModelsFilters>;
}

export default function useForumModels({ filters }: UseModelsOptions) {
  const {
    data: rows,
    page,
    count: totalCount,
    refresh,
    error,
    pending,
    loadNextPage: nextPage,
    canLoadMore: hasMore,
  } = useApiPagination(
    () => JSON.stringify(filters.value),
    async (page) => {
      const query: ModelsQuery = {
        limit: modelRules.pageLimit,
        page,
      };
      return fetchModelCards(modelsQuerySchema.parse({ ...filters.value, ...query }));
    },
  );

  const isEmpty = computed(() => !pending.value && rows.value.length === 0);

  return {
    page,
    rows,
    totalCount,
    pending,
    error,
    hasMore,
    isEmpty,
    refresh,
    nextPage,
  };
}
