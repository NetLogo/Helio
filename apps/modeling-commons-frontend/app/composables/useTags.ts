export type Tag = ResponseSuccessData<"GET", "/api/v1/tags">["data"][number];
export default function useTags() {
  const { GET } = useApi();
  const prefix = ref("");
  const key = computed(() => `tags-${prefix.value}`);

  const {
    data: tags,
    error,
    pending,
    loadNextPage,
    canLoadMore,
    count,
  } = useApiPagination(key, async (page: number) => {
    const { data, error } = await GET("/api/v1/tags", {
      params: { query: { limit: 20, offset: (page - 1) * 20, q: prefix.value } },
    });

    const parsed = handleApiError(data, error, "fetching tags");

    return parsed;
  });

  return {
    prefix,
    tags,
    error,
    pending,
    loadNextPage,
    canLoadMore,
    count,
  };
}
