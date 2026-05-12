type InteractionKind = "views" | "runs" | "downloads" | "shares";

export default function useModelInteractions() {
  const apiBase = useRuntimeConfig().public.apiBase as string;

  async function post(path: string, body?: Record<string, unknown>): Promise<void> {
    await fetch(`${apiBase}${path}`, {
      method: "POST",
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => null);
  }

  async function del(path: string): Promise<void> {
    await fetch(`${apiBase}${path}`, {
      method: "DELETE",
      credentials: "include",
    }).catch(() => null);
  }

  function record(modelId: string, kind: InteractionKind, versionNumber?: number) {
    return post(
      `/api/v1/models/${modelId}/${kind}`,
      versionNumber ? { versionNumber } : {},
    );
  }

  return {
    like: (modelId: string) => post(`/api/v1/models/${modelId}/like`),
    unlike: (modelId: string) => del(`/api/v1/models/${modelId}/like`),
    recordView: (modelId: string, versionNumber?: number) => record(modelId, "views", versionNumber),
    recordRun: (modelId: string, versionNumber?: number) => record(modelId, "runs", versionNumber),
    recordDownload: (modelId: string, versionNumber?: number) =>
      record(modelId, "downloads", versionNumber),
    recordShare: (modelId: string, versionNumber?: number) =>
      record(modelId, "shares", versionNumber),
  };
}

export type { InteractionKind };
