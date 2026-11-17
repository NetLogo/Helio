const INTERACTION_PATHS = {
  views: "/api/v1/models/{id}/views",
  runs: "/api/v1/models/{id}/runs",
  downloads: "/api/v1/models/{id}/downloads",
  shares: "/api/v1/models/{id}/shares",
} as const;

export type InteractionKind = keyof typeof INTERACTION_PATHS;

export async function fetchModel(id: string): Promise<Model | null> {
  const { data, error } = await useApi().GET("/api/v1/models/{id}", {
    params: { path: { id } },
  });
  if (error) throw error;
  return data ?? null;
}

export async function fetchModelCard(id: string): Promise<ModelCard | null> {
  const { data, error } = await useApi().GET("/api/v1/models/{id}/card", {
    params: { path: { id } },
  });
  if (error) throw error;
  return data ?? null;
}

export async function fetchModelCards(query: ModelsQuery): Promise<ModelCardsPage> {
  const { data, error } = await useApi().GET("/api/v1/models/card", { params: { query } });
  return handleApiError(data, error, "fetching model query result");
}

export async function fetchModelFamilyCard(id: string): Promise<ModelFamilyCard | null> {
  const { data, error } = await useApi().GET("/api/v1/models/{id}/family/card", {
    params: { path: { id } },
  });
  if (error) throw error;
  return data ?? null;
}

export async function fetchModelAdditionalFiles(id: string): Promise<AdditionalFile[]> {
  const { data, error } = await useApi().GET("/api/v1/models/{id}/additional-files", {
    params: { path: { id } },
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchModelVersions(id: string): Promise<ModelVersion[]> {
  const { data, error } = await useApi().GET("/api/v1/models/{id}/versions", {
    params: { path: { id }, query: { limit: 100, page: 0 } },
  });
  if (error) throw error;
  return data?.data ?? [];
}

export async function fetchModelVersionCard(
  id: string,
  version: number,
): Promise<ModelVersionCard | null> {
  const { data, error } = await useApi().GET("/api/v1/models/{id}/versions/{version}/card", {
    params: { path: { id, version } },
  });
  if (error) throw error;
  return data ?? null;
}

export async function fetchModelPermissions(id: string): Promise<UserModelPermissions | null> {
  const { data, error } = await useApi().GET("/api/v1/models/{id}/me/permissions", {
    params: { path: { id } },
  });
  if (error) throw error;
  return data ?? null;
}

export async function getRandomModelId(): Promise<RandomModel | null> {
  try {
    const { data, error } = await useApi().GET("/api/v1/models/random");
    return handleApiError(data, error, "fetching random model ID");
  } catch (e) {
    console.error("Error fetching random model ID", e);
    return null;
  }
}

export async function deleteModelById(id: string): Promise<void> {
  const { data, error } = await useApi().DELETE("/api/v1/models/{id}", {
    params: { path: { id } },
  });
  handleApiError(data, error, "deleting model");
}

async function ignoreFailure(request: Promise<unknown>): Promise<void> {
  await request.catch(() => null);
}

export function likeModel(id: string): Promise<void> {
  return ignoreFailure(useApi().POST("/api/v1/models/{id}/like", { params: { path: { id } } }));
}

export function unlikeModel(id: string): Promise<void> {
  return ignoreFailure(useApi().DELETE("/api/v1/models/{id}/like", { params: { path: { id } } }));
}

export function recordModelInteraction(
  id: string,
  kind: InteractionKind,
  versionNumber?: number,
): Promise<void> {
  return ignoreFailure(
    useApi().POST(INTERACTION_PATHS[kind], {
      params: { path: { id } },
      body: versionNumber ? { versionNumber } : {},
    }),
  );
}
