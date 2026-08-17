export type Tag = ResponseSuccessData<"GET", "/api/v1/tags">["data"][number];
export default function useTags() {
  const { GET } = useApi();
  const { query, debouncedQuery } = useSearchQuery({
    transform: (q) => (q.trim().length === 0 ? undefined : q.trim()),
  });
  const key = computed(() => `tags-${debouncedQuery.value}`);

  const {
    data: tags,
    error,
    pending,
    loadNextPage,
    canLoadMore,
    count,
  } = useApiPagination(key, async (page: number) => {
    const { data, error } = await GET("/api/v1/tags", {
      params: { query: { limit: 20, page, q: debouncedQuery.value } },
    });

    const parsed = handleApiError(data, error, "fetching tags");

    return parsed;
  });

  return {
    prefix: query,
    tags,
    error,
    pending,
    loadNextPage,
    canLoadMore,
    count,
  };
}
