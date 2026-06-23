import type { AdditionalFile } from "~/composables/model/useModelAdditionalFiles";
import type { ModelCard } from "~/composables/model/useModelCard";
import type { DraftData, StagedFile, Visibility } from "~/composables/model/useModelDraft";
import { getModelPreviewCard } from "~/forms/models";
import type { PrimaryFileMeta, StagedAttachmentMeta, UploadFormInput } from "~/forms/upload";
import { collectTagNames, draftToFormState, emptyUploadFormState } from "~/forms/upload";

type PreviewImageMeta = NonNullable<DraftData["previewImage"]>;

export interface UseModelDraftFormOptions {
  mode?: "create" | "edit";
  initialDraftId?: string;
  seedModelId?: string;
}

export default function useModelDraftForm(opts: UseModelDraftFormOptions = {}) {
  const { DELETE } = useApi();
  const {
    draftId,
    saving,
    publishing,
    pendingWrite,
    ensureDraft,
    load,
    patch,
    uploadPrimaryFile,
    uploadModelFile,
    uploadAttachment,
    uploadPreviewImage: uploadPreviewImageApi,
    removeFile,
    generatePreview: generatePreviewApi,
    publish,
    abandon,
  } = useModelDraft(opts.initialDraftId);

  const formState = ref<UploadFormInput>(emptyUploadFormState());
  const pickedFile = ref<File | null>(null);
  const primaryFile = ref<PrimaryFileMeta | null>(null);
  const stagedAttachments = ref<StagedAttachmentMeta[]>([]);
  const modelFiles = ref<File[]>([]);
  const additionalFiles = ref<File[]>([]);

  const hydrating = ref(false);
  const initialized = ref(false);
  const initializing = ref(false);
  const deletingModel = ref(false);
  const generatingPreview = ref(false);
  const uploadingPreview = ref(false);

  const originalData = ref<DraftData | null>(null);
  const originalPreviewImageUrl = ref<string | null>(null);
  const hydratedAttachmentIds = ref<Set<string>>(new Set());
  const removedModelFileIds = ref<Set<string>>(new Set());

  const { data: liveAdditionalFiles } = opts.seedModelId
    ? useModelAdditionalFiles(opts.seedModelId)
    : { data: ref<AdditionalFile[] | null>(null) };

  const previewImage = ref<PreviewImageMeta | null>(null);
  const previewImageUrl = ref<string | null>(null);

  const currentUser = useUser();

  const previewCard = computed<ModelCard>(() => {
    const fileLike =
      pickedFile.value ?? (primaryFile.value ? { name: primaryFile.value.filename } : null);
    return getModelPreviewCard({
      file: fileLike,
      permission: formState.value.permission,
      title: formState.value.title,
      description: formState.value.description,
      previewImageUrl: previewImageUrl.value,
      me: currentUser.value,
    });
  });

  const hasPrimaryFile = computed(() => primaryFile.value !== null || pickedFile.value !== null);

  const existingModelFiles = computed<StagedAttachmentMeta[]>(() =>
    stagedAttachments.value.filter(
      (a) => hydratedAttachmentIds.value.has(a.id) && (a.kind ?? "model") === "model",
    ),
  );

  const sessionAddedAdditionalFiles = computed<StagedAttachmentMeta[]>(() =>
    stagedAttachments.value.filter(
      (a) => !hydratedAttachmentIds.value.has(a.id) && a.kind === "additional",
    ),
  );

  const lockedAdditionalFiles = computed<AdditionalFile[]>(() =>
    (liveAdditionalFiles.value ?? []).filter((f) => f.kind === "additional"),
  );

  const primaryFileChanged = computed(() => {
    const originalKey = originalData.value?.primaryFile?.s3Key;
    if (!originalKey) return primaryFile.value !== null || pickedFile.value !== null;
    return primaryFile.value?.s3Key !== originalKey;
  });

  const modelFilesAdded = computed(
    () => modelFiles.value.length > 0 || removedModelFileIds.value.size > 0,
  );

  const sessionAddedAttachments = computed(() =>
    stagedAttachments.value.filter((a) => !hydratedAttachmentIds.value.has(a.id)),
  );

  const isDirty = computed(() => {
    if (!originalData.value) {
      return (
        pickedFile.value !== null ||
        modelFiles.value.length > 0 ||
        additionalFiles.value.length > 0 ||
        formState.value.title !== "" ||
        formState.value.description !== ""
      );
    }
    const orig = originalData.value;
    const restored = draftToFormState(orig).formState;
    if (formState.value.title !== restored.title) return true;
    if (formState.value.description !== restored.description) return true;
    if (formState.value.permission !== restored.permission) return true;
    const origTags = collectTagNames(restored).sort().join(",");
    const currTags = collectTagNames(formState.value).sort().join(",");
    if (origTags !== currTags) return true;
    if (pickedFile.value !== null) return true;
    if (modelFiles.value.length > 0) return true;
    if (additionalFiles.value.length > 0) return true;
    if (primaryFileChanged.value) return true;
    if (sessionAddedAttachments.value.length > 0) return true;
    if (removedModelFileIds.value.size > 0) return true;
    return false;
  });

  const saveStatusLabel = computed(() => {
    if (!draftId.value) return "";
    if (saving.value || pendingWrite.value) return "Saving…";
    return "Saved";
  });

  async function flushDraft(): Promise<void> {
    await patch.flush();
  }

  function hydrateFromDraft(data: DraftData, serverPreviewImageUrl: string | null = null) {
    hydrating.value = true;
    originalData.value = JSON.parse(JSON.stringify(data)) as DraftData;
    originalPreviewImageUrl.value = serverPreviewImageUrl;
    const next = draftToFormState(data);
    formState.value = next.formState;
    primaryFile.value = next.primaryFile;
    stagedAttachments.value = next.attachments;
    hydratedAttachmentIds.value = new Set(next.attachments.map((a) => a.id));
    removedModelFileIds.value = new Set();
    previewImage.value = data.previewImage ? { ...data.previewImage } : null;
    previewImageUrl.value = serverPreviewImageUrl;
    pickedFile.value = null;
    modelFiles.value = [];
    additionalFiles.value = [];
    return nextTick().then(() => {
      hydrating.value = false;
    });
  }

  async function init(): Promise<void> {
    if (initialized.value) return;
    initialized.value = true;
    initializing.value = true;
    try {
      if (opts.initialDraftId) {
        try {
          const draft = await load(opts.initialDraftId);
          await hydrateFromDraft(
            draft.data,
            (draft as unknown as { previewImageUrl: string | null }).previewImageUrl ?? null,
          );
        } catch {
          showNotFoundToast("Draft", "We could not load that draft. Starting fresh.");
        }
        return;
      }
      if (opts.seedModelId) {
        try {
          const id = await ensureDraft({ modelId: opts.seedModelId });
          const draft = await load(id);
          await hydrateFromDraft(
            draft.data,
            (draft as unknown as { previewImageUrl: string | null }).previewImageUrl ?? null,
          );
        } catch (err) {
          showActionFailedToast(
            "Could not start edit",
            err instanceof Error
              ? err.message
              : "Failed to create an editable draft for this model.",
          );
        }
      }
    } finally {
      initializing.value = false;
    }
  }

  watch(pickedFile, async (file) => {
    if (hydrating.value) return;
    if (!file) {
      if (primaryFile.value) return;
      formState.value = emptyUploadFormState();
      return;
    }

    if (opts.mode === "create" && !/\.nlogox(3d)?$/i.test(file.name)) {
      showActionFailedToast("Invalid file type", "Please upload a .nlogox or .nlogox3d file.");
      pickedFile.value = null;
      return;
    } else if (opts.mode === "edit" && !/\.nlogo(x)?(3d)?$/i.test(file.name)) {
      showActionFailedToast(
        "Invalid file type",
        "Please upload a .nlogo, .nlogox, .nlogo3d, or .nlogox3d file.",
      );
      pickedFile.value = null;
      return;
    }

    if (formState.value.title === "") {
      formState.value.title = file.name.replace(/\.nlogox$/i, "");
      try {
        const infoTab = await readInfoTabFromNlogox(await file.text());
        if (infoTab && formState.value.description === "") {
          formState.value.description = await getFirstParagraphTextFromMarkdown(infoTab);
        }
      } catch {
        // Ignore info-tab parse failures; description stays blank.
      }
    }
    try {
      await ensureDraft();
      const staged = await uploadPrimaryFile(file);
      primaryFile.value = {
        fileId: staged.fileId,
        filename: staged.filename,
        sizeBytes: staged.sizeBytes,
        mimeType: staged.mimeType,
        s3Key: staged.s3Key,
      };
      await patch({
        title: formState.value.title,
        description: formState.value.description,
      });
    } catch (err) {
      showActionFailedToast(
        "Upload failed",
        err instanceof Error ? err.message : "Could not stage the model file.",
      );
      pickedFile.value = null;
    }
  });

  watch(
    () => formState.value.title,
    (v) => {
      if (hydrating.value) return;
      void patch({ title: v });
    },
  );

  watch(
    () => formState.value.description,
    (v) => {
      if (hydrating.value) return;
      void patch({ description: v });
    },
  );

  watch(
    () => [
      ...(formState.value.tags ?? []),
      ...(formState.value.subjects ?? []),
      ...(formState.value.usecases ?? []),
    ],
    () => {
      if (hydrating.value) return;
      void patch({ tags: collectTagNames(formState.value) });
    },
  );

  async function syncAttachments(
    files: File[] | undefined,
    prev: File[] | undefined,
    upload: (file: File) => Promise<StagedFile>,
    kind: "model" | "additional",
  ): Promise<void> {
    if (hydrating.value) return;
    const current = files ?? [];
    const previous = prev ?? [];
    const added = current.filter((f) => !previous.includes(f));
    for (const file of added) {
      try {
        const staged = await upload(file);
        stagedAttachments.value.push({
          id: staged.fileId,
          filename: staged.filename,
          sizeBytes: staged.sizeBytes,
          mimeType: staged.mimeType,
          s3Key: staged.s3Key,
          kind,
        });
      } catch (err) {
        showActionFailedToast(
          "Upload failed",
          err instanceof Error ? err.message : `Failed to upload ${file.name}.`,
        );
      }
    }
    const removed = previous.filter((f) => !current.includes(f));
    for (const file of removed) {
      const match = stagedAttachments.value.find(
        (s) => s.filename === file.name && !hydratedAttachmentIds.value.has(s.id),
      );
      if (match) {
        stagedAttachments.value = stagedAttachments.value.filter((s) => s !== match);
        await removeFile(match.id).catch(() => null);
      }
    }
  }

  watch(modelFiles, (files, prev) => {
    void syncAttachments(files, prev, uploadModelFile, "model");
  });

  watch(additionalFiles, (files, prev) => {
    void syncAttachments(files, prev, uploadAttachment, "additional");
  });

  async function removeExistingModelFile(fileId: string): Promise<void> {
    const match = stagedAttachments.value.find((s) => s.id === fileId);
    if (!match) return;
    stagedAttachments.value = stagedAttachments.value.filter((s) => s !== match);
    hydratedAttachmentIds.value.delete(fileId);
    removedModelFileIds.value = new Set(removedModelFileIds.value).add(fileId);
    await removeFile(fileId).catch(() => null);
  }

  async function submit(visibility: Visibility): Promise<{ id: string } | null> {
    if (publishing.value) return null;
    if (!primaryFile.value && !pickedFile.value) {
      showActionFailedToast("Missing model file", "Upload a .nlogox before publishing.");
      return null;
    }
    if (!formState.value.title.trim()) {
      showActionFailedToast("Missing title", "Add a title before publishing.");
      return null;
    }
    await patch.flush();
    await patch({ visibility, tags: collectTagNames(formState.value) });
    await patch.flush();
    return publish();
  }

  async function discard(): Promise<void> {
    if (!draftId.value) return;
    await abandon();
  }

  async function generatePreview(): Promise<void> {
    if (generatingPreview.value || uploadingPreview.value) return;
    if (!primaryFile.value && !pickedFile.value) {
      showActionFailedToast("No model file", "Upload a .nlogox before generating a preview image.");
      return;
    }
    generatingPreview.value = true;
    try {
      const result = await generatePreviewApi();
      previewImage.value = {
        s3Key: result.s3Key,
        filename: result.filename,
        sizeBytes: result.sizeBytes,
        mimeType: result.mimeType,
      };
      previewImageUrl.value = result.previewImageUrl;
      if (originalData.value) {
        originalData.value = {
          ...originalData.value,
          previewImage: { ...previewImage.value },
        };
      }
      originalPreviewImageUrl.value = result.previewImageUrl;
    } catch (err) {
      showActionFailedToast(
        "Preview generation failed",
        err instanceof Error
          ? err.message
          : "Could not generate a preview image. Try again or publish to auto-generate one.",
      );
    } finally {
      generatingPreview.value = false;
    }
  }

  async function uploadPreviewImage(file: File): Promise<void> {
    if (uploadingPreview.value || generatingPreview.value) return;
    uploadingPreview.value = true;
    try {
      await ensureDraft();
      const result = await uploadPreviewImageApi(file);
      previewImage.value = {
        s3Key: result.s3Key,
        filename: result.filename,
        sizeBytes: result.sizeBytes,
        mimeType: result.mimeType,
      };
      previewImageUrl.value = result.previewImageUrl;
      if (originalData.value) {
        originalData.value = {
          ...originalData.value,
          previewImage: { ...previewImage.value },
        };
      }
      originalPreviewImageUrl.value = result.previewImageUrl;
    } catch (err) {
      showActionFailedToast(
        "Preview upload failed",
        err instanceof Error
          ? err.message
          : "Could not upload that preview image. Try a different file.",
      );
    } finally {
      formState.value.imageFile = null;
      uploadingPreview.value = false;
    }
  }

  watch(
    () => formState.value.imageFile,
    (file) => {
      if (hydrating.value) return;
      if (!file) return;
      void uploadPreviewImage(file);
    },
  );

  async function revert(): Promise<void> {
    if (!originalData.value) return;
    const sessionAddedIds = stagedAttachments.value
      .map((a) => a.id)
      .filter((id) => !hydratedAttachmentIds.value.has(id));
    for (const id of sessionAddedIds) {
      await removeFile(id).catch(() => null);
    }
    await hydrateFromDraft(originalData.value, originalPreviewImageUrl.value);
    const restored = formState.value;
    await patch.flush();
    await patch({
      title: restored.title,
      description: restored.description,
      visibility: restored.permission as Visibility,
      tags: collectTagNames(restored),
    });
    await patch.flush();
  }

  async function deleteModel(): Promise<void> {
    if (!opts.seedModelId) throw new Error("No model to delete");
    deletingModel.value = true;
    try {
      const { data, error } = await DELETE("/api/v1/models/{id}", {
        params: { path: { id: opts.seedModelId } },
      });
      handleApiError(data, error, "deleting model");
      await abandon().catch(() => null);
    } finally {
      deletingModel.value = false;
    }
  }

  return {
    draftId,
    saving,
    publishing,
    hydrating,
    initializing,
    formState,
    pickedFile,
    primaryFile,
    stagedAttachments,
    modelFiles,
    additionalFiles,
    previewCard,
    saveStatusLabel,
    hasPrimaryFile,
    existingModelFiles,
    sessionAddedAdditionalFiles,
    lockedAdditionalFiles,
    removeExistingModelFile,
    primaryFileChanged,
    modelFilesAdded,
    isDirty,
    deletingModel,
    generatingPreview,
    uploadingPreview,
    previewImage,
    previewImageUrl,
    init,
    hydrateFromDraft,
    generatePreview,
    uploadPreviewImage,
    flushDraft,
    submit,
    discard,
    revert,
    deleteModel,
  };
}
