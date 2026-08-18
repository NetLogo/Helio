export type PopularTag = ResponseSuccessData<"GET", "/api/v1/tags/popular">["data"][number];

export default function usePopularTags(limit = 24) {
  const { GET } = useApi();

  const { data, error, pending, loadNextPage, canLoadMore, count } =
    useApiPagination<PopularTag>(`popular-tags-${limit}`, async (page: number) => {
      const { data, error } = await GET("/api/v1/tags/popular", {
        params: { query: { limit, page } },
      });

      return handleApiError(data, error, "fetching popular tags");
    });

  return {
    tags: data,
    error,
    pending,
    loadNextPage,
    canLoadMore,
    count,
  };
}
