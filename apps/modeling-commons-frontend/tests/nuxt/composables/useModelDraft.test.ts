import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useModelDraft from "~/composables/useModelDraft";

let apiBase: string;

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), init);
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  apiBase = useRuntimeConfig().public.apiBase as string;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useModelDraft.ensureDraft", () => {
  it("POSTs once and caches the returned id", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "draft-99" }));

    const draft = useModelDraft();
    const id1 = await draft.ensureDraft();
    const id2 = await draft.ensureDraft();

    expect(id1).toBe("draft-99");
    expect(id2).toBe("draft-99");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`${apiBase}/api/v1/model-drafts`);
    expect((init as RequestInit).method).toBe("POST");
  });
});

describe("useModelDraft.patch (debounced)", () => {
  it("collapses 3 quick patches into one PATCH with the latest fields", async () => {
    vi.useFakeTimers();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "draft-1" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const draft = useModelDraft();
    void draft.patch({ title: "first" });
    void draft.patch({ title: "second" });
    void draft.patch({ title: "third" });

    await vi.advanceTimersByTimeAsync(500);
    await draft.patch.flush();

    const patchCalls = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === "PATCH",
    );
    expect(patchCalls.length).toBe(1);
    const body = JSON.parse((patchCalls[0]![1] as RequestInit).body as string);
    expect(body).toEqual({ title: "third" });
  });
});

describe("useModelDraft.uploadPrimaryFile / uploadAttachment", () => {
  it("POSTs FormData with role=primary and returns a StagedFile", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "draft-1" })).mockResolvedValueOnce(
      jsonResponse({
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

    expect(staged).toEqual({
      fileId: "file-1",
      filename: "a.nlogo",
      sizeBytes: 42,
      mimeType: "application/x-netlogo",
      status: "uploaded",
    });

    const uploadCall = fetchMock.mock.calls[1]!;
    expect(uploadCall[0]).toBe(`${apiBase}/api/v1/model-drafts/draft-1/files`);
    const init = uploadCall[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    const fd = init.body as FormData;
    expect(fd.get("role")).toBe("primary");
    expect((fd.get("file") as File).name).toBe("a.nlogo");
  });

  it("uploadAttachment POSTs with role=attachment", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "draft-1" })).mockResolvedValueOnce(
      jsonResponse({
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

    const fd = (fetchMock.mock.calls[1]![1] as RequestInit).body as FormData;
    expect(fd.get("role")).toBe("attachment");
  });
});

describe("useModelDraft.removeFile", () => {
  it("no-ops when there is no draftId", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const draft = useModelDraft();
    await draft.removeFile("file-x");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("DELETEs the file when a draftId exists", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const draft = useModelDraft("draft-1");
    await draft.removeFile("file-x");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`${apiBase}/api/v1/model-drafts/draft-1/files/file-x`);
    expect((init as RequestInit).method).toBe("DELETE");
  });
});

describe("useModelDraft.publish", () => {
  it("POSTs and returns { id: response.modelId }", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse({ modelId: "model-77", versionNumber: 1 }));

    const draft = useModelDraft("draft-1");
    const result = await draft.publish();

    expect(result).toEqual({ id: "model-77" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`${apiBase}/api/v1/model-drafts/draft-1/publish`);
    expect((init as RequestInit).method).toBe("POST");
  });
});

describe("useModelDraft.abandon", () => {
  it("DELETEs and clears local state", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const draft = useModelDraft("draft-1");
    await draft.abandon();

    expect(draft.draftId.value).toBeNull();
    expect(draft.draft.value).toBeNull();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`${apiBase}/api/v1/model-drafts/draft-1`);
    expect((init as RequestInit).method).toBe("DELETE");
  });
});

describe("useModelDraft error path", () => {
  it("throws Error with the server-provided message on non-OK responses", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Bad input" }, { status: 422 }));

    const draft = useModelDraft();
    await expect(draft.ensureDraft()).rejects.toThrow("Bad input");
  });
});
