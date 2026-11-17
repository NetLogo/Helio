export default function usePopularTags(limit = 24) {
  const { data, error, pending, loadNextPage, canLoadMore, count } = useApiPagination<PopularTag>(
    `popular-tags-${limit}`,
    (page: number) => fetchPopularTags(page, limit),
  );

  return {
    tags: data,
    error,
    pending,
    loadNextPage,
    canLoadMore,
    count,
  };
}
