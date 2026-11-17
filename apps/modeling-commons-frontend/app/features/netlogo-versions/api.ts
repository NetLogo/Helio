export async function fetchNetlogoVersionsByPrefix(prefix?: string): Promise<string[]> {
  const { data, error } = await useApi().GET("/api/v1/netlogo-versions", {
    params: { query: { prefix } },
  });
  return handleApiError(data, error, "fetching NetLogo versions");
}
