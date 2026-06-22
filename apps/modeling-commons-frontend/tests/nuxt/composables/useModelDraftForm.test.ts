import { computed, nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import useModelDraftForm from "~/composables/model/useModelDraftForm";
import type { DraftData } from "~/composables/model/useModelDraft";
import { apiResult, makeApiClientMock } from "~~/tests/helpers/mockApi";

const { apiState, userState } = vi.hoisted(() => ({
  apiState: { current: null as ReturnType<typeof makeApiClientMock> | null },
  userState: {
    current: {
      isLoggedIn: true,
      user: { id: "user-1", name: "Ada", image: null },
      session: {},
    } as unknown,
  },
}));

mockNuxtImport("useApi", () => () => apiState.current!.client);
mockNuxtImport("useUser", () => () => computed(() => userState.current));

function makeDraftDto(
  data: DraftData,
  id = "draft-1",
  previewImageUrl: string | null = null,
) {
  return {
    id,
    userId: "user-1",
    modelId: null,
    schemaVersion: 1,
    data,
    previewImageUrl,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const sampleDraftData: DraftData = {
  title: "Wolf Sheep",
  description: "predator-prey",
  visibility: "public",
  tags: ["agents", "usecase:research"],
  primaryFile: {
    s3Key: "staging/u/d/abc-model.nlogox",
    filename: "model.nlogox",
    sizeBytes: 4096,
    mimeType: "application/octet-stream",
  },
  attachments: [
    {
      id: "att-existing-1",
      s3Key: "staging/u/d/xyz-readme.md",
      filename: "readme.md",
      sizeBytes: 200,
      mimeType: "text/markdown",
    },
  ],
};

beforeEach(() => {
  apiState.current = makeApiClientMock();
  // Default resolvers so background debounced calls never reject unhandled.
  apiState.current.PATCH.mockResolvedValue(apiResult.ok(undefined as never));
  apiState.current.POST.mockResolvedValue(apiResult.ok({ id: "draft-default" }));
  apiState.current.DELETE.mockResolvedValue(apiResult.ok(undefined as never));
});

describe("useModelDraftForm", () => {
  describe("init with initialDraftId", () => {
    it("loads the draft and hydrates form fields, primary file, and attachments", async () => {
      apiState.current!.GET.mockResolvedValue(apiResult.ok(makeDraftDto(sampleDraftData)));

      const form = useModelDraftForm({ initialDraftId: "draft-1" });
      await form.init();

      expect(apiState.current!.GET).toHaveBeenCalledWith(
        "/api/v1/model-drafts/{id}",
        { params: { path: { id: "draft-1" } } },
      );
      expect(form.formState.value.title).toBe("Wolf Sheep");
      expect(form.formState.value.description).toBe("predator-prey");
      expect(form.formState.value.permission).toBe("public");
      expect(form.formState.value.tags).toEqual(["agents"]);
      expect(form.formState.value.usecases).toEqual(["research"]);
      expect(form.primaryFile.value?.filename).toBe("model.nlogox");
      expect(form.existingAttachments.value).toHaveLength(1);
      expect(form.existingAttachments.value[0]?.id).toBe("att-existing-1");
    });

    it("does not call PATCH while hydrating (watchers are suppressed)", async () => {
      apiState.current!.GET.mockResolvedValue(apiResult.ok(makeDraftDto(sampleDraftData)));

      const form = useModelDraftForm({ initialDraftId: "draft-1" });
      await form.init();
      await nextTick();
      await nextTick();

      expect(apiState.current!.PATCH).not.toHaveBeenCalled();
    });

    it("isDirty is false immediately after hydration", async () => {
      apiState.current!.GET.mockResolvedValue(apiResult.ok(makeDraftDto(sampleDraftData)));

      const form = useModelDraftForm({ initialDraftId: "draft-1" });
      await form.init();
      expect(form.isDirty.value).toBe(false);
    });

    it("isDirty becomes true after the user edits the title", async () => {
      apiState.current!.GET.mockResolvedValue(apiResult.ok(makeDraftDto(sampleDraftData)));

      const form = useModelDraftForm({ initialDraftId: "draft-1" });
      await form.init();
      form.formState.value.title = "Wolf Sheep v2";
      await nextTick();
      expect(form.isDirty.value).toBe(true);
    });

    it("hasPrimaryFile reflects hydrated primary metadata even without a picked File", async () => {
      apiState.current!.GET.mockResolvedValue(apiResult.ok(makeDraftDto(sampleDraftData)));

      const form = useModelDraftForm({ initialDraftId: "draft-1" });
      await form.init();
      expect(form.hasPrimaryFile.value).toBe(true);
      expect(form.pickedFile.value).toBeNull();
    });

    it("init() is idempotent — second call does not re-fetch", async () => {
      apiState.current!.GET.mockResolvedValue(apiResult.ok(makeDraftDto(sampleDraftData)));

      const form = useModelDraftForm({ initialDraftId: "draft-1" });
      await form.init();
      await form.init();
      expect(apiState.current!.GET).toHaveBeenCalledTimes(1);
    });
  });

  describe("init with seedModelId", () => {
    it("creates a draft seeded by modelId then loads it", async () => {
      apiState.current!.POST.mockResolvedValue(apiResult.ok({ id: "draft-2" }));
      apiState.current!.GET.mockResolvedValue(apiResult.ok(makeDraftDto(sampleDraftData, "draft-2")));

      const form = useModelDraftForm({ seedModelId: "model-1" });
      await form.init();

      expect(apiState.current!.POST).toHaveBeenCalledWith(
        "/api/v1/model-drafts",
        { body: { modelId: "model-1" } },
      );
      expect(apiState.current!.GET).toHaveBeenCalledWith(
        "/api/v1/model-drafts/{id}",
        { params: { path: { id: "draft-2" } } },
      );
      expect(form.formState.value.title).toBe("Wolf Sheep");
    });
  });

  describe("primaryFileChanged", () => {
    it("is false right after hydration", async () => {
      apiState.current!.GET.mockResolvedValue(apiResult.ok(makeDraftDto(sampleDraftData)));
      const form = useModelDraftForm({ initialDraftId: "draft-1" });
      await form.init();
      expect(form.primaryFileChanged.value).toBe(false);
    });

    it("flips true when primaryFile.s3Key differs from the hydrated key", async () => {
      apiState.current!.GET.mockResolvedValue(apiResult.ok(makeDraftDto(sampleDraftData)));
      const form = useModelDraftForm({ initialDraftId: "draft-1" });
      await form.init();
      form.primaryFile.value = { ...form.primaryFile.value!, s3Key: "staging/u/d/NEW-model.nlogox" };
      expect(form.primaryFileChanged.value).toBe(true);
    });
  });

  describe("revert", () => {
    it("restores text fields after a local edit", async () => {
      apiState.current!.GET.mockResolvedValue(apiResult.ok(makeDraftDto(sampleDraftData)));
      apiState.current!.PATCH.mockResolvedValue(apiResult.ok(undefined as never));
      const form = useModelDraftForm({ initialDraftId: "draft-1" });
      await form.init();

      form.formState.value.title = "Wolf Sheep v2";
      form.formState.value.description = "edited";
      await nextTick();
      expect(form.isDirty.value).toBe(true);

      await form.revert();

      expect(form.formState.value.title).toBe("Wolf Sheep");
      expect(form.formState.value.description).toBe("predator-prey");
      expect(form.isDirty.value).toBe(false);
    });

    it("deletes session-added attachments via the API", async () => {
      apiState.current!.GET.mockResolvedValue(apiResult.ok(makeDraftDto(sampleDraftData)));
      apiState.current!.PATCH.mockResolvedValue(apiResult.ok(undefined as never));
      apiState.current!.DELETE.mockResolvedValue(apiResult.ok(undefined as never));

      const form = useModelDraftForm({ initialDraftId: "draft-1" });
      await form.init();

      form.stagedAttachments.value.push({
        id: "att-session-1",
        s3Key: "staging/u/d/session-doc.pdf",
        filename: "doc.pdf",
        sizeBytes: 100,
        mimeType: "application/pdf",
      });

      await form.revert();

      expect(apiState.current!.DELETE).toHaveBeenCalledWith(
        "/api/v1/model-drafts/{id}/files/{fileId}",
        { params: { path: { id: "draft-1", fileId: "att-session-1" } } },
      );
      expect(form.existingAttachments.value).toHaveLength(1);
      expect(form.existingAttachments.value[0]?.id).toBe("att-existing-1");
    });
  });

  describe("deleteModel", () => {
    it("calls DELETE /api/v1/models/{id} when seedModelId is set", async () => {
      apiState.current!.POST.mockResolvedValue(apiResult.ok({ id: "draft-3" }));
      apiState.current!.GET.mockResolvedValue(apiResult.ok(makeDraftDto(sampleDraftData, "draft-3")));
      apiState.current!.DELETE.mockResolvedValue(apiResult.ok(undefined as never));

      const form = useModelDraftForm({ seedModelId: "model-1" });
      await form.init();
      await form.deleteModel();

      expect(apiState.current!.DELETE).toHaveBeenCalledWith(
        "/api/v1/models/{id}",
        { params: { path: { id: "model-1" } } },
      );
    });

    it("throws when no model is seeded (upload mode)", async () => {
      const form = useModelDraftForm({});
      await expect(form.deleteModel()).rejects.toThrow(/No model to delete/);
    });
  });

  describe("generatePreview", () => {
    it("calls POST /v1/model-drafts/{id}/preview-image/generate and updates previewImageUrl on success", async () => {
      apiState.current!.GET.mockResolvedValue(apiResult.ok(makeDraftDto(sampleDraftData)));
      apiState.current!.POST.mockResolvedValue(
        apiResult.ok({
          s3Key: "staging/u/d/preview.png",
          filename: "preview.png",
          sizeBytes: 1234,
          mimeType: "image/png",
          previewImageUrl: "https://signed.example/preview.png",
        }),
      );

      const form = useModelDraftForm({ initialDraftId: "draft-1" });
      await form.init();
      await form.generatePreview();

      expect(apiState.current!.POST).toHaveBeenCalledWith(
        "/api/v1/model-drafts/{id}/preview-image/generate",
        { params: { path: { id: "draft-1" } } },
      );
      expect(form.previewImageUrl.value).toBe("https://signed.example/preview.png");
      expect(form.previewImage.value?.s3Key).toBe("staging/u/d/preview.png");
      expect(form.generatingPreview.value).toBe(false);
    });

    it("does not call the API when no primary file is present", async () => {
      apiState.current!.GET.mockResolvedValue(
        apiResult.ok(makeDraftDto({ ...sampleDraftData, primaryFile: undefined })),
      );
      const form = useModelDraftForm({ initialDraftId: "draft-1" });
      await form.init();

      const postCallsBefore = apiState.current!.POST.mock.calls.length;
      await form.generatePreview();
      expect(apiState.current!.POST.mock.calls.length).toBe(postCallsBefore);
    });

    it("hydrates previewImageUrl from the server-provided top-level field", async () => {
      apiState.current!.GET.mockResolvedValue(
        apiResult.ok(makeDraftDto(sampleDraftData, "draft-1", "https://signed.example/p.png")),
      );
      const form = useModelDraftForm({ initialDraftId: "draft-1" });
      await form.init();
      expect(form.previewImageUrl.value).toBe("https://signed.example/p.png");
    });
  });

  describe("uploadPreviewImage", () => {
    it("uploads a preview image and updates previewImage / previewImageUrl", async () => {
      apiState.current!.GET.mockResolvedValue(apiResult.ok(makeDraftDto(sampleDraftData)));
      apiState.current!.POST.mockResolvedValue(
        apiResult.ok({
          role: "preview",
          s3Key: "staging/u/d/preview.png",
          filename: "preview.png",
          sizeBytes: 2048,
          mimeType: "image/png",
          previewImageUrl: "https://signed.example/preview.png",
        }),
      );

      const form = useModelDraftForm({ initialDraftId: "draft-1" });
      await form.init();

      const file = new File([new Uint8Array(8)], "preview.png", { type: "image/png" });
      await form.uploadPreviewImage(file);

      expect(apiState.current!.POST).toHaveBeenCalledWith(
        "/api/v1/model-drafts/{id}/files",
        expect.objectContaining({ params: { path: { id: "draft-1" } } }),
      );
      expect(form.previewImageUrl.value).toBe("https://signed.example/preview.png");
      expect(form.previewImage.value?.s3Key).toBe("staging/u/d/preview.png");
      expect(form.previewImage.value?.mimeType).toBe("image/png");
      expect(form.uploadingPreview.value).toBe(false);
      expect(form.formState.value.imageFile).toBeNull();
    });

    it("toasts and clears imageFile when the upload fails", async () => {
      apiState.current!.GET.mockResolvedValue(apiResult.ok(makeDraftDto(sampleDraftData)));
      apiState.current!.POST.mockResolvedValue(apiResult.err(500, "boom"));

      const form = useModelDraftForm({ initialDraftId: "draft-1" });
      await form.init();
      const previewBefore = form.previewImageUrl.value;

      const file = new File([new Uint8Array(8)], "preview.png", { type: "image/png" });
      await form.uploadPreviewImage(file);

      expect(form.previewImageUrl.value).toBe(previewBefore);
      expect(form.uploadingPreview.value).toBe(false);
      expect(form.formState.value.imageFile).toBeNull();
    });

    it("no-ops when an upload is already in flight", async () => {
      apiState.current!.GET.mockResolvedValue(apiResult.ok(makeDraftDto(sampleDraftData)));
      let resolveUpload: ((value: unknown) => void) = () => {};
      apiState.current!.POST.mockImplementation(
        () =>
          new Promise((res) => {
            resolveUpload = res as (value: unknown) => void;
          }),
      );

      const form = useModelDraftForm({ initialDraftId: "draft-1" });
      await form.init();

      const file = new File([new Uint8Array(8)], "preview.png", { type: "image/png" });
      const first = form.uploadPreviewImage(file);
      // Let microtasks flush enough for the first call to reach the POST.
      for (let i = 0; i < 5; i++) await nextTick();
      expect(form.uploadingPreview.value).toBe(true);

      const callsBefore = apiState.current!.POST.mock.calls.length;
      await form.uploadPreviewImage(file);
      expect(apiState.current!.POST.mock.calls.length).toBe(callsBefore);

      resolveUpload(
        apiResult.ok({
          role: "preview",
          s3Key: "k",
          filename: "f",
          sizeBytes: 1,
          mimeType: "image/png",
          previewImageUrl: "https://signed.example/p.png",
        }),
      );
      await first;
    });
  });

  describe("saveStatusLabel", () => {
    it("shows 'Saving…' while a debounced write is pending, then 'Saved' after flush", async () => {
      apiState.current!.GET.mockResolvedValue(apiResult.ok(makeDraftDto(sampleDraftData)));
      const form = useModelDraftForm({ initialDraftId: "draft-1" });
      await form.init();

      expect(form.saveStatusLabel.value).toBe("Saved");

      form.formState.value.title = "Wolf Sheep v2";
      await nextTick();
      expect(form.saveStatusLabel.value).toBe("Saving…");

      await form.flushDraft();
      expect(form.saveStatusLabel.value).toBe("Saved");
    });
  });

  describe("existingAttachments vs session-added", () => {
    it("only includes hydrated attachment ids", async () => {
      apiState.current!.GET.mockResolvedValue(apiResult.ok(makeDraftDto(sampleDraftData)));
      const form = useModelDraftForm({ initialDraftId: "draft-1" });
      await form.init();

      form.stagedAttachments.value.push({
        id: "att-session-1",
        s3Key: "k",
        filename: "f",
        sizeBytes: 1,
        mimeType: "x",
      });

      const ids = form.existingAttachments.value.map((a) => a.id);
      expect(ids).toEqual(["att-existing-1"]);
    });
  });
});
