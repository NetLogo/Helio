import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import useModelDraft from "~/composables/model/useModelDraft";
import { makeApiClientMock, apiResult } from "~~/tests/helpers/mockApi";

const { apiState } = vi.hoisted(() => ({
  apiState: { current: null as ReturnType<typeof makeApiClientMock> | null },
}));

mockNuxtImport("useApi", () => () => apiState.current!.client);

beforeEach(() => {
  vi.resetAllMocks();
  apiState.current = makeApiClientMock();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useModelDraft.ensureDraft", () => {
  it("POSTs once and caches the returned id", async () => {
    apiState.current!.POST.mockResolvedValueOnce(apiResult.ok({ id: "draft-99" }));

    const draft = useModelDraft();
    const id1 = await draft.ensureDraft();
    const id2 = await draft.ensureDraft();

    expect(id1).toBe("draft-99");
    expect(id2).toBe("draft-99");
    expect(apiState.current!.POST).toHaveBeenCalledTimes(1);
    expect(apiState.current!.POST).toHaveBeenCalledWith("/api/v1/model-drafts", { body: {} });
  });

  it("forwards modelId in the body when provided", async () => {
    apiState.current!.POST.mockResolvedValueOnce(apiResult.ok({ id: "draft-1" }));

    const draft = useModelDraft();
    await draft.ensureDraft({ modelId: "model-7" });

    expect(apiState.current!.POST).toHaveBeenCalledWith("/api/v1/model-drafts", {
      body: { modelId: "model-7" },
    });
  });
});

describe("useModelDraft.patch (debounced)", () => {
  it("collapses 3 quick patches into one PATCH with the latest fields", async () => {
    vi.useFakeTimers();
    apiState.current!.POST.mockResolvedValueOnce(apiResult.ok({ id: "draft-1" }));
    apiState.current!.PATCH.mockResolvedValueOnce(apiResult.ok({}));

    const draft = useModelDraft();
    void draft.patch({ title: "first" });
    void draft.patch({ title: "second" });
    void draft.patch({ title: "third" });

    await vi.advanceTimersByTimeAsync(500);
    await draft.patch.flush();

    expect(apiState.current!.PATCH).toHaveBeenCalledTimes(1);
    expect(apiState.current!.PATCH).toHaveBeenCalledWith("/api/v1/model-drafts/{id}", {
      params: { path: { id: "draft-1" } },
      body: { title: "third" },
    });
  });
});

describe("useModelDraft.uploadPrimaryFile / uploadAttachment", () => {
  it("POSTs FormData with role=primary and returns a StagedFile", async () => {
    apiState.current!.POST
      .mockResolvedValueOnce(apiResult.ok({ id: "draft-1" }))
      .mockResolvedValueOnce(
        apiResult.ok({
          id: "file-1",
          role: "primary",
          s3Key: "key",
          filename: "a.nlogo",
          sizeBytes: 42,
          mimeType: "application/x-netlogo",
        }),
      );

    const draft = useModelDraft();
    const file = new File(["x"], "a.nlogo", { type: "application/x-netlogo" });
    const staged = await draft.uploadPrimaryFile(file);

    expect(staged).toMatchObject({
      fileId: "file-1",
      filename: "a.nlogo",
      sizeBytes: 42,
      mimeType: "application/x-netlogo",
      s3Key: "key",
      status: "uploaded",
    });

    const [path, opts] = apiState.current!.POST.mock.calls[1]!;
    expect(path).toBe("/api/v1/model-drafts/{id}/files");
    expect((opts as { params: { path: { id: string } } }).params.path.id).toBe("draft-1");
    const body = (opts as { body: FormData }).body;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("role")).toBe("primary");
    expect((body.get("file") as File).name).toBe("a.nlogo");
  });

  it("uploadAttachment POSTs with role=attachment", async () => {
    apiState.current!.POST
      .mockResolvedValueOnce(apiResult.ok({ id: "draft-1" }))
      .mockResolvedValueOnce(
        apiResult.ok({
          id: "file-2",
          role: "attachment",
          s3Key: "k",
          filename: "extras.csv",
          sizeBytes: 10,
          mimeType: "text/csv",
        }),
      );

    const draft = useModelDraft();
    const file = new File(["y"], "extras.csv", { type: "text/csv" });
    const staged = await draft.uploadAttachment(file);

    expect(staged.fileId).toBe("file-2");
    expect(staged.status).toBe("uploaded");

    const body = (apiState.current!.POST.mock.calls[1]![1] as { body: FormData }).body;
    expect(body.get("role")).toBe("attachment");
  });
});

describe("useModelDraft.removeFile", () => {
  it("no-ops when there is no draftId", async () => {
    const draft = useModelDraft();
    await draft.removeFile("file-x");
    expect(apiState.current!.DELETE).not.toHaveBeenCalled();
  });

  it("DELETEs the file when a draftId exists", async () => {
    apiState.current!.DELETE.mockResolvedValueOnce(apiResult.ok({}));

    const draft = useModelDraft("draft-1");
    await draft.removeFile("file-x");

    expect(apiState.current!.DELETE).toHaveBeenCalledTimes(1);
    expect(apiState.current!.DELETE).toHaveBeenCalledWith(
      "/api/v1/model-drafts/{id}/files/{fileId}",
      { params: { path: { id: "draft-1", fileId: "file-x" } } },
    );
  });
});

describe("useModelDraft.publish", () => {
  it("POSTs and returns { id: response.modelId }", async () => {
    apiState.current!.POST.mockResolvedValueOnce(
      apiResult.ok({ modelId: "model-77", versionNumber: 1 }),
    );

    const draft = useModelDraft("draft-1");
    const result = await draft.publish();

    expect(result).toEqual({ id: "model-77" });
    expect(apiState.current!.POST).toHaveBeenCalledWith("/api/v1/model-drafts/{id}/publish", {
      params: { path: { id: "draft-1" } },
    });
  });
});

describe("useModelDraft.abandon", () => {
  it("DELETEs and clears local state", async () => {
    apiState.current!.DELETE.mockResolvedValueOnce(apiResult.ok({}));

    const draft = useModelDraft("draft-1");
    await draft.abandon();

    expect(draft.draftId.value).toBeNull();
    expect(draft.draft.value).toBeNull();
    expect(apiState.current!.DELETE).toHaveBeenCalledWith("/api/v1/model-drafts/{id}", {
      params: { path: { id: "draft-1" } },
    });
  });
});