export default function useUsers() {
  const key = computed(() => `users-${query.value}`);
  const { GET } = useApi();

  const query = useSearchQuery("userId");

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
    return query.value.length > 0 ? query.value : undefined;
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
