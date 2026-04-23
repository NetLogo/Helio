import type { UploadForm, UploadFormInput } from "~/components/upload/form";
import { UploadFormSchema } from "~/components/upload/form";

type Visibility = "private" | "unlisted" | "public";

interface UploadOptions {
  form: UploadFormInput;
  modelFiles: File[];
  additionalFiles: File[];
  visibility: Visibility;
}

interface UploadResult {
  id: string;
  versionNumber: number;
}

export default function useUploadModel() {
  const api = useApi();
  const apiBase = useRuntimeConfig().public.apiBase as string;
  const submitting = ref(false);
  const modelId = ref<string | null>(null);
  const modelUrl = computed(() => (modelId.value ? `/models/${modelId.value}` : null));

  async function postMultipart<T>(path: string, body: FormData): Promise<T> {
    const res = await fetch(`${apiBase}${path}`, {
      method: "POST",
      credentials: "include",
      body,
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? `Request failed (${res.status})`);
    }
    return (await res.json()) as T;
  }

  async function createModel(
    form: { title: string; description?: string },
    visibility: Visibility,
  ): Promise<string> {
    // Idempotent creation, patchable
    if (modelId.value) {
      updateVisibility(modelId.value, visibility).catch(() => {
        throw new Error(
          "Failed to update model visibility. Please check the model settings after submission.",
        );
      });
      return modelId.value;
    }
    const { data, error } = await api.POST("/api/v1/models", {
      body: {
        title: form.title,
        description: form.description || undefined,
        visibility,
      },
    });
    if (error || !data) throw new Error(describeError(error) ?? "Failed to create model");
    modelId.value = data.id;
    return data.id;
  }

  async function updateVisibility(id: string, visibility: Visibility): Promise<void> {
    await api.PATCH("/api/v1/models/{id}", {
      params: { path: { id } },
      body: {
        visibility,
      },
    });
  }

  async function createVersion(id: string, form: UploadForm): Promise<number> {
    const body = new FormData();
    body.append("file", form.nlogoxFile);
    body.append("title", form.title);
    if (form.description) body.append("description", form.description);

    const { versionNumber } = await postMultipart<{ versionNumber: number }>(
      `/api/v1/models/${id}/versions`,
      body,
    );
    return versionNumber;
  }

  async function addTag(id: string, name: string): Promise<void> {
    await api.POST("/api/v1/models/{id}/tags", {
      params: { path: { id } },
      body: { name },
    });
  }

  async function uploadAdditionalFile(id: string, file: File): Promise<void> {
    const body = new FormData();
    body.append("file", file);
    await postMultipart(`/api/v1/models/${id}/additional-files`, body);
  }

  function validate(form: UploadFormInput): { data: UploadForm } | { error: string } {
    const parsed = UploadFormSchema.safeParse(form);
    if (!parsed.success) {
      console.log("Validation error", parsed.error);
      return { error: parsed.error.issues[0]?.message ?? "Please review the form for errors." };
    }
    return { data: parsed.data };
  }

  function collectTagNames(form: UploadForm): string[] {
    return [
      ...form.tags.map((t) => t.trim()).filter(Boolean),
      ...form.subjects.map((s) => s.trim()).filter(Boolean),
      ...form.usecases.map((u) => `usecase:${u}`),
    ];
  }

  async function submitDraft(form: { title: string; description?: string }): Promise<void> {
    try {
      await createModel(form, "private");
    } catch (err) {
      throw new Error(describeError(err) ?? "Failed to save draft");
    }
  }

  async function submit(options: UploadOptions): Promise<UploadResult> {
    const result = validate(options.form);
    if ("error" in result) throw new Error(result.error);

    submitting.value = true;
    try {
      const form = result.data;
      const id = await createModel(form, options.visibility);
      await createVersion(id, form);

      for (const name of collectTagNames(form)) {
        await addTag(id, name).catch(() => null);
      }

      await Promise.all(
        [...options.modelFiles, ...options.additionalFiles].map((file) =>
          uploadAdditionalFile(id, file).catch(() => null),
        ),
      );

      return { id, versionNumber: 1 };
    } finally {
      submitting.value = false;
    }
  }

  return { submitting, submit, submitDraft, validate, modelUrl };
}

function describeError(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return null;
}

export type { UploadOptions, UploadResult, Visibility };
