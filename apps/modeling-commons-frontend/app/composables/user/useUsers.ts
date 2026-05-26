export default function useUsers() {
  const { GET } = useApi();

  const { query, debouncedQuery } = useSearchQuery();
  const key = computed(() => `users-${debouncedQuery.value}`);

  const {
    data: users,
    error,
    pending,
    loadNextPage,
    canLoadMore,
    count,
  } = useApiPagination(
    key,
    async (page: number) => {
      const { data, error } = await GET("/api/v1/users", {
        params: { query: { limit: 20, offset: (page - 1) * 20, keyword: _getKeywordValue() } },
      });

      const parsed = handleApiError(data, error, "fetching users");

      return parsed;
    },
    { lazy: true },
  );

  function reset() {
    query.value = "";
  }

  function _getKeywordValue() {
    return debouncedQuery.value?.trim().length === 0 ? undefined : debouncedQuery.value?.trim();
  }

  return {
    query,
    users,
    error,
    pending,
    loadNextPage,
    canLoadMore,
    count,
    reset,
  };
}

export type ApiUser = ResponseSuccessData<"GET", "/api/v1/users/{id}">;
