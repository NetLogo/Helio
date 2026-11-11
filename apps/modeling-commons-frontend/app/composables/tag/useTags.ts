export default function useTags() {
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
  } = useApiPagination(key, (page: number) => fetchTags(page, debouncedQuery.value));

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
