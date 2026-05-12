type Visibility = "private" | "unlisted" | "public";

export interface DraftFile {
  id?: string;
  s3Key: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
}

export interface DraftData {
  title?: string;
  description?: string;
  visibility?: Visibility;
  tags?: string[];
  primaryFile?: DraftFile;
  attachments?: DraftFile[];
}

export interface ModelDraftDto {
  id: string;
  userId: string;
  modelId: string | null;
  schemaVersion: number;
  data: DraftData;
  createdAt: string;
  updatedAt: string;
}

export interface DraftFormFields {
  title?: string;
  description?: string;
  visibility?: Visibility;
  tags?: string[];
}

export interface StagedFile {
  fileId: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  status: "uploading" | "uploaded" | "failed";
  error?: string;
}

const DRAFTS_PATH = "/api/v1/model-drafts";

function describeError(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return null;
}

function debounceWithFlush<Args extends unknown[]>(
  fn: (...args: Args) => Promise<void>,
  wait: number,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Args | null = null;
  let pendingResolve: (() => void) | null = null;
  let pendingPromise: Promise<void> | null = null;

  async function run() {
    if (!pendingArgs) return;
    const args = pendingArgs;
    pendingArgs = null;
    const resolve = pendingResolve;
    pendingResolve = null;
    pendingPromise = null;
    timer = null;
    try {
      await fn(...args);
    } finally {
      resolve?.();
    }
  }

  function debounced(...args: Args): Promise<void> {
    pendingArgs = args;
    if (!pendingPromise) {
      pendingPromise = new Promise((r) => {
        pendingResolve = r;
      });
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void run(), wait);
    return pendingPromise;
  }

  debounced.flush = async (): Promise<void> => {
    if (timer) {
      clearTimeout(timer);
      await run();
    }
  };

  return debounced;
}

export default function useModelDraft(initialDraftId?: string) {
  const apiBase = useRuntimeConfig().public.apiBase as string;

  const draftId = ref<string | null>(initialDraftId ?? null);
  const draft = ref<ModelDraftDto | null>(null);
  const saving = ref(false);
  const publishing = ref(false);
  const loadError = ref<string | null>(null);

  async function request<T>(
    path: string,
    init: RequestInit & { asJson?: boolean } = {},
  ): Promise<T> {
    const { asJson = true, ...rest } = init;
    const res = await fetch(`${apiBase}${path}`, {
      credentials: "include",
      ...rest,
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? `Request failed (${res.status})`);
    }
    if (res.status === 204) return undefined as T;
    return asJson ? ((await res.json()) as T) : (undefined as T);
  }

  async function ensureDraft(opts?: { modelId?: string }): Promise<string> {
    if (draftId.value) return draftId.value;
    const body = opts?.modelId ? { modelId: opts.modelId } : {};
    const created = await request<{ id: string }>(DRAFTS_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    draftId.value = created.id;
    return created.id;
  }

  async function load(id: string): Promise<void> {
    loadError.value = null;
    try {
      const loaded = await request<ModelDraftDto>(`${DRAFTS_PATH}/${id}`);
      draftId.value = loaded.id;
      draft.value = loaded;
    } catch (err) {
      loadError.value = describeError(err) ?? "Failed to load draft";
      throw err;
    }
  }

  const patch = debounceWithFlush(async (fields: Partial<DraftFormFields>) => {
    const id = await ensureDraft();
    saving.value = true;
    try {
      await request(`${DRAFTS_PATH}/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(fields),
        asJson: false,
      });
    } finally {
      saving.value = false;
    }
  }, 500);

  async function uploadFileRaw(role: "primary" | "attachment", file: File): Promise<StagedFile> {
    const id = await ensureDraft();
    const body = new FormData();
    body.append("role", role);
    body.append("file", file);
    const res = await fetch(`${apiBase}${DRAFTS_PATH}/${id}/files`, {
      method: "POST",
      credentials: "include",
      body,
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? `Upload failed (${res.status})`);
    }
    const out = (await res.json()) as {
      id?: string;
      role: "primary" | "attachment";
      s3Key: string;
      filename: string;
      sizeBytes: number;
      mimeType: string;
    };
    return {
      fileId: out.id ?? "primary",
      filename: out.filename,
      sizeBytes: out.sizeBytes,
      mimeType: out.mimeType,
      status: "uploaded",
    };
  }

  async function uploadPrimaryFile(file: File): Promise<StagedFile> {
    return uploadFileRaw("primary", file);
  }

  async function uploadAttachment(file: File): Promise<StagedFile> {
    return uploadFileRaw("attachment", file);
  }

  async function removeFile(fileId: string): Promise<void> {
    const id = draftId.value;
    if (!id) return;
    await request(`${DRAFTS_PATH}/${id}/files/${fileId}`, {
      method: "DELETE",
      asJson: false,
    });
  }

  async function publish(): Promise<{ id: string }> {
    const id = draftId.value;
    if (!id) throw new Error("No draft to publish");
    publishing.value = true;
    try {
      const result = await request<{ modelId: string; versionNumber: number }>(
        `${DRAFTS_PATH}/${id}/publish`,
        { method: "POST" },
      );
      return { id: result.modelId };
    } finally {
      publishing.value = false;
    }
  }

  async function abandon(): Promise<void> {
    const id = draftId.value;
    if (!id) return;
    await request(`${DRAFTS_PATH}/${id}`, { method: "DELETE", asJson: false });
    draftId.value = null;
    draft.value = null;
  }

  return {
    draftId,
    draft,
    saving,
    publishing,
    loadError,
    ensureDraft,
    load,
    patch,
    uploadPrimaryFile,
    uploadAttachment,
    removeFile,
    publish,
    abandon,
  };
}

export type { Visibility };
