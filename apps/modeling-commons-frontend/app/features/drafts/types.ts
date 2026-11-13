export type ModelDraftDto = ResponseSuccessData<"GET", "/api/v1/model-drafts/{id}">;
export type ModelDraftList = ResponseSuccessData<"GET", "/api/v1/model-drafts">;
export type DraftData = ModelDraftDto["data"];
export type DraftFile = NonNullable<DraftData["primaryFile"]>;
export type Visibility = NonNullable<DraftData["visibility"]>;
export type DraftFormFields = RequestBody<"PATCH", "/api/v1/model-drafts/{id}">;
export type CreatedDraft = ResponseSuccessData<"POST", "/api/v1/model-drafts">;
export type UploadedDraftFile = ResponseSuccessData<"POST", "/api/v1/model-drafts/{id}/files">;
export type DraftFileRole = UploadedDraftFile["role"];
export type GeneratedDraftPreview = ResponseSuccessData<
  "POST",
  "/api/v1/model-drafts/{id}/preview-image/generate"
>;
export type PrimaryFileMeta = NonNullable<DraftData["primaryFile"]> & { fileId?: string };
export type StagedAttachmentMeta = NonNullable<DraftData["attachments"]>[number];
