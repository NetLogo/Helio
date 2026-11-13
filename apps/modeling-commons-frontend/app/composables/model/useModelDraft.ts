export interface StagedFile {
  fileId: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  s3Key: string;
  status: "uploading" | "uploaded" | "failed";
  error?: string;
}

function debounceWithFlush<Args extends unknown[]>(
  fn: (...args: Args) => Promise<void>,
  wait: number,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Args | null = null;
  let pendingResolve: (() => void) | null = null;
  let pendingPromise: Promise<void> | null = null;
  const pending = ref(false);

  async function run() {
    if (!pendingArgs) return;
    const args = pendingArgs;
    pendingArgs = null;
    const resolve = pendingResolve;
    pendingResolve = null;
    pendingPromise = null;
    timer = null;
    pending.value = false;
    try {
      await fn(...args);
    } finally {
      resolve?.();
    }
  }

  function debounced(...args: Args): Promise<void> {
    pendingArgs = args;
    pending.value = true;
    if (!pendingPromise) {
      pendingPromise = new Promise((r) => {
        pendingResolve = r;
      });
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void run(), wait);
    return pendingPromise;
  }

  debounced.pending = pending;

  debounced.flush = async (): Promise<void> => {
    if (timer) {
      clearTimeout(timer);
      await run();
    }
  };

  return debounced;
}

export default function useModelDraft(initialDraftId?: string) {
  const draftId = ref<string | null>(initialDraftId ?? null);
  const draft = ref<ModelDraftDto | null>(null);
  const saving = ref(false);
  const publishing = ref(false);

  async function ensureDraft(opts?: { modelId?: string }): Promise<string> {
    if (draftId.value) return draftId.value;
    const parsed = await createDraft(opts?.modelId);
    draftId.value = parsed.id;
    return parsed.id;
  }

  async function load(id: string): Promise<ModelDraftDto> {
    const parsed = await fetchDraft(id);
    draftId.value = parsed.id;
    draft.value = parsed;
    return parsed;
  }

  const patch = debounceWithFlush(async (fields: DraftFormFields) => {
    const id = await ensureDraft();
    saving.value = true;
    try {
      await updateDraft(id, fields);
    } finally {
      saving.value = false;
    }
  }, 500);

  async function uploadFileRaw(
    role: DraftFileRole,
    file: File,
  ): Promise<StagedFile & { previewImageUrl?: string }> {
    const id = await ensureDraft();
    const parsed = await uploadDraftFile(id, role, file);
    return {
      fileId: parsed.id ?? role,
      filename: parsed.filename,
      sizeBytes: parsed.sizeBytes,
      mimeType: parsed.mimeType,
      s3Key: parsed.s3Key,
      status: "uploaded",
      previewImageUrl: parsed.previewImageUrl,
    };
  }

  async function uploadPrimaryFile(file: File): Promise<StagedFile> {
    return uploadFileRaw("primary", file);
  }

  async function uploadModelFile(file: File): Promise<StagedFile> {
    return uploadFileRaw("model-file", file);
  }

  async function uploadAttachment(file: File): Promise<StagedFile> {
    return uploadFileRaw("attachment", file);
  }

  async function uploadPreviewImage(file: File): Promise<StagedFile & { previewImageUrl: string }> {
    const staged = await uploadFileRaw("preview", file);
    if (!staged.previewImageUrl) {
      throw new Error("Server did not return a preview image URL");
    }
    return { ...staged, previewImageUrl: staged.previewImageUrl };
  }

  async function removeFile(fileId: string): Promise<void> {
    const id = draftId.value;
    if (!id) return;
    await deleteDraftFile(id, fileId);
  }

  async function generatePreview(): Promise<GeneratedDraftPreview> {
    return generateDraftPreview(await ensureDraft());
  }

  async function publish(): Promise<{ id: string }> {
    const id = draftId.value;
    if (!id) throw new Error("No draft to publish");
    publishing.value = true;
    try {
      return await publishDraft(id);
    } finally {
      publishing.value = false;
    }
  }

  async function abandon(): Promise<void> {
    const id = draftId.value;
    if (!id) return;
    const { data, error } = await deleteDraft(id);
    handleApiError(data, error, "discarding draft");
    draftId.value = null;
    draft.value = null;
  }

  return {
    draftId,
    draft,
    saving,
    publishing,
    pendingWrite: patch.pending,
    ensureDraft,
    load,
    patch,
    uploadPrimaryFile,
    uploadModelFile,
    uploadAttachment,
    uploadPreviewImage,
    removeFile,
    generatePreview,
    publish,
    abandon,
  };
}
