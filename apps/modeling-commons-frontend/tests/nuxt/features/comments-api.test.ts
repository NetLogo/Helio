import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createComment,
  deleteComment,
  editComment,
  fetchComment,
  fetchModelComments,
  likeComment,
  unlikeComment,
} from "~/features/comments/api";
import {
  jsonResponse,
  makeRecordingApi,
  type RecordedRequest,
  type RecordingApi,
} from "~~/tests/helpers/notifications";

const { apiState } = vi.hoisted(() => ({
  apiState: { current: null as RecordingApi | null },
}));

mockNuxtImport("useApi", () => () => apiState.current!.client);

const apiComment = {
  id: "c-1",
  modelId: "m-1",
  author: { id: "user-ada", name: "Ada Lovelace", image: "" },
  content: "Hello",
  createdAt: "2026-10-01T12:00:00.000Z",
  likes: 0,
};

function respondLikeTheServer(request: RecordedRequest) {
  if (request.method === "GET" && request.url.pathname.endsWith("/comments")) {
    return jsonResponse({ count: 1, limit: 20, page: 0, data: [apiComment] });
  }
  if (request.method === "GET") return jsonResponse(apiComment);
  if (request.method === "POST" && request.url.pathname.endsWith("/comments")) {
    return jsonResponse({ id: "c-2" }, 201);
  }
  return new Response(null, { status: 204 });
}

beforeEach(() => {
  apiState.current = makeRecordingApi();
  apiState.current.respondWith(respondLikeTheServer);
});

function getRecorded() {
  return apiState.current!.requests.map(({ method, url, body }) => ({
    method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    body,
  }));
}

describe("comment reads", () => {
  it("sends the list sort and page as query params", async () => {
    await fetchModelComments("m-1", {
      sort: "newest",
      page: 2,
      limit: 5,
    });

    expect(getRecorded()).toEqual([
      {
        method: "GET",
        path: "/api/v1/models/m-1/comments",
        query: { sort: "newest", page: "2", limit: "5" },
        body: undefined,
      },
    ]);
  });

  it("sends the reply page as query params on a single comment", async () => {
    await fetchComment("m-1", "c-1", { page: 1, limit: 2 });

    expect(getRecorded()).toEqual([
      {
        method: "GET",
        path: "/api/v1/models/m-1/comments/c-1",
        query: { page: "1", limit: "2" },
        body: undefined,
      },
    ]);
  });

  it("maps a 404 on a single comment to null", async () => {
    apiState.current!.respondWith(() => jsonResponse({ message: "gone" }, 404));

    await expect(fetchComment("m-1", "c-9", {})).resolves.toBeNull();
  });

  it("throws when the list request fails without a body", async () => {
    apiState.current!.respondWith(() => new Response(null, { status: 500 }));

    await expect(fetchModelComments("m-1", {})).rejects.toThrow("500");
  });
});

describe("comment mutations", () => {
  it("POSTs a new comment body and returns the created id", async () => {
    const created = await createComment("m-1", { content: "Hi", parentId: "c-1" });

    expect(created).toEqual({ id: "c-2" });
    expect(getRecorded()).toEqual([
      {
        method: "POST",
        path: "/api/v1/models/m-1/comments",
        query: {},
        body: { content: "Hi", parentId: "c-1" },
      },
    ]);
  });

  it("sends edit, like, unlike and delete to the comment paths", async () => {
    await editComment("m-1", "c-1", "Edited");
    await likeComment("m-1", "c-1");
    await unlikeComment("m-1", "c-1");
    await deleteComment("m-1", "c-1");

    expect(getRecorded().map(({ method, path, body }) => ({ method, path, body }))).toEqual([
      { method: "PATCH", path: "/api/v1/models/m-1/comments/c-1", body: { content: "Edited" } },
      { method: "POST", path: "/api/v1/models/m-1/comments/c-1/like", body: undefined },
      { method: "DELETE", path: "/api/v1/models/m-1/comments/c-1/like", body: undefined },
      { method: "DELETE", path: "/api/v1/models/m-1/comments/c-1", body: undefined },
    ]);
  });

  it("throws when the server refuses a mutation", async () => {
    apiState.current!.respondWith(() => new Response(null, { status: 403 }));

    await expect(likeComment("m-1", "c-1")).rejects.toThrow("403");
  });
});
