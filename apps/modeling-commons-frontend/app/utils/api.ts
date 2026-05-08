export async function fetchCards(
  api: ReturnType<typeof useApi>,
  ids: string[],
): Promise<ModelCard[]> {
  const cards = await Promise.all(
    ids.map(async (id) => {
      const { data } = await api.GET("/api/v1/models/{id}/card", {
        params: { path: { id } },
      });
      return (data as ModelCard | undefined) ?? null;
    }),
  );
  return cards.filter((c): c is ModelCard => c !== null);
}

export async function fetchUserById(
  api: ReturnType<typeof useApi>,
  id: string,
): Promise<ApiUser | null> {
  try {
    const { data, error } = await api.GET("/api/v1/users/{id}", {
      params: { path: { id } },
    });
    const parsed = handleApiError(data, error, "fetching user");
    return parsed as ApiUser;
  } catch (e) {
    console.error("Error fetching user", e);
    return null;
  }
}

export async function fetchTagByIdOrName(
  api: ReturnType<typeof useApi>,
  idOrName: string,
): Promise<Tag | null> {
  try {
    const { data, error } = await api.GET("/api/v1/tags/{idOrName}", {
      params: { path: { idOrName } },
    });
    const parsed = handleApiError(data, error, "fetching tag");
    return parsed as Tag;
  } catch (e) {
    console.error("Error fetching tag", e);
    return null;
  }
}

export async function fetchNetlogoVersionsByPrefix(prefix?: string): Promise<string[]> {
  const { GET } = useApi();
  const { data, error } = await GET("/api/v1/netlogo-versions", {
    params: { query: { prefix } },
  });
  const parsed = handleApiError(data, error, "fetching NetLogo versions");
  return parsed as string[];
}
