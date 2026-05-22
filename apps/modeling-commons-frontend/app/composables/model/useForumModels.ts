import {
  modelsPageLimit,
  modelsQuerySchema,
  type ModelsFilters,
  type ModelSortBy,
  type ModelsQuery,
} from "~/forms/models";

export type { ModelSortBy, ModelsQuery };

interface UseModelsOptions {
  filters: Ref<ModelsFilters> | ComputedRef<ModelsFilters>;
}

export default function useForumModels({ filters }: UseModelsOptions) {
  const { GET } = useApi();

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
        limit: modelsPageLimit,
        page,
      };
      const params = modelsQuerySchema.parse({ ...filters.value, ...query });
      const res = await GET("/api/v1/models/card", { params: { query: params } });
      const parsed = handleApiError(res.data, res.error, "fetching model query result");
      return parsed;
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
