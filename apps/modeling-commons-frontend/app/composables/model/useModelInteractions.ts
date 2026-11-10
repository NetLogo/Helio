type InteractionKind = "views" | "runs" | "downloads" | "shares";

const INTERACTION_PATHS = {
  views: "/api/v1/models/{id}/views",
  runs: "/api/v1/models/{id}/runs",
  downloads: "/api/v1/models/{id}/downloads",
  shares: "/api/v1/models/{id}/shares",
} as const;

async function ignoreFailure(request: Promise<unknown>): Promise<void> {
  await request.catch(() => null);
}

export default function useModelInteractions() {
  const api = useApi();

  function record(modelId: string, kind: InteractionKind, versionNumber?: number) {
    return ignoreFailure(
      api.POST(INTERACTION_PATHS[kind], {
        params: { path: { id: modelId } },
        body: versionNumber ? { versionNumber } : {},
      }),
    );
  }

  return {
    like: (modelId: string) =>
      ignoreFailure(api.POST("/api/v1/models/{id}/like", { params: { path: { id: modelId } } })),
    unlike: (modelId: string) =>
      ignoreFailure(api.DELETE("/api/v1/models/{id}/like", { params: { path: { id: modelId } } })),
    recordView: (modelId: string, versionNumber?: number) =>
      record(modelId, "views", versionNumber),
    recordRun: (modelId: string, versionNumber?: number) => record(modelId, "runs", versionNumber),
    recordDownload: (modelId: string, versionNumber?: number) =>
      record(modelId, "downloads", versionNumber),
    recordShare: (modelId: string, versionNumber?: number) =>
      record(modelId, "shares", versionNumber),
  };
}

export type { InteractionKind };
