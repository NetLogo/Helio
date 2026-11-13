const TAGS_PAGE_LIMIT = 20;

export async function fetchTags(page: number, q?: string): Promise<TagsPage> {
  const { data, error } = await useApi().GET("/api/v1/tags", {
    params: { query: { limit: TAGS_PAGE_LIMIT, page, q } },
  });
  return handleApiError(data, error, "fetching tags");
}

export async function fetchTagByIdOrName(idOrName: string): Promise<TagDetail | null> {
  try {
    const { data, error } = await useApi().GET("/api/v1/tags/{idOrName}", {
      params: { path: { idOrName } },
    });
    return handleApiError(data, error, "fetching tag");
  } catch (e) {
    console.error("Error fetching tag", e);
    return null;
  }
}

export async function fetchPopularTags(page: number, limit: number): Promise<PopularTagsPage> {
  const { data, error } = await useApi().GET("/api/v1/tags/popular", {
    params: { query: { limit, page } },
  });
  return handleApiError(data, error, "fetching popular tags");
}
