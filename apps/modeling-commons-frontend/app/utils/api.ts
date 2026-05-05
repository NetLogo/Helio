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
