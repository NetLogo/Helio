export default function useUsers() {
  const { query, debouncedQuery } = useSearchQuery();
  const key = computed(() => `users-${debouncedQuery.value}`);

  const {
    data: users,
    error,
    pending,
    loadNextPage,
    canLoadMore,
    count,
  } = useApiPagination(key, (page: number) => fetchUsers(page, _getKeywordValue()), { lazy: true });

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
