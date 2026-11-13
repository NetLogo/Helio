export async function createDraft(modelId?: string): Promise<CreatedDraft> {
  const { data, error } = await useApi().POST("/api/v1/model-drafts", {
    body: modelId ? { modelId } : {},
  });
  return handleApiError(data, error, "creating draft");
}

export async function fetchDraft(id: string): Promise<ModelDraftDto> {
  const { data, error } = await useApi().GET("/api/v1/model-drafts/{id}", {
    params: { path: { id } },
  });
  return handleApiError(data, error, "loading draft");
}

export async function fetchDrafts(): Promise<ModelDraftList> {
  const { data, error } = await useApi().GET("/api/v1/model-drafts");
  return handleApiError(data, error, "loading drafts");
}

export async function updateDraft(id: string, fields: DraftFormFields): Promise<void> {
  const { data, error } = await useApi().PATCH("/api/v1/model-drafts/{id}", {
    params: { path: { id } },
    body: fields,
  });
  handleApiError(data, error, "saving draft");
}

export async function uploadDraftFile(
  id: string,
  role: DraftFileRole,
  file: File,
): Promise<UploadedDraftFile> {
  const body = new FormData();
  body.append("role", role);
  body.append("file", file);
  const { data, error } = await useApi().POST("/api/v1/model-drafts/{id}/files", {
    params: { path: { id } },
    body: body as never,
    bodySerializer: (b) => b as unknown as FormData,
  });
  return handleApiError(data, error, "uploading file");
}

export async function deleteDraftFile(id: string, fileId: string): Promise<void> {
  const { data, error } = await useApi().DELETE("/api/v1/model-drafts/{id}/files/{fileId}", {
    params: { path: { id, fileId } },
  });
  handleApiError(data, error, "removing file");
}

export async function generateDraftPreview(id: string): Promise<GeneratedDraftPreview> {
  const { data, error } = await useApi().POST("/api/v1/model-drafts/{id}/preview-image/generate", {
    params: { path: { id } },
  });
  return handleApiError(data, error, "generating preview image");
}

export async function publishDraft(id: string): Promise<{ id: string }> {
  const { data, error } = await useApi().POST("/api/v1/model-drafts/{id}/publish", {
    params: { path: { id } },
  });
  const parsed = handleApiError(data, error, "publishing draft");
  return { id: parsed.modelId };
}

export function deleteDraft(id: string) {
  return useApi().DELETE("/api/v1/model-drafts/{id}", { params: { path: { id } } });
}
