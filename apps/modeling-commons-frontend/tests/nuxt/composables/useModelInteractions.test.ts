import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useModelInteractions from "~/composables/model/useModelInteractions";
import { makeRecordingApi, type RecordingApi } from "~~/tests/helpers/notifications";

const { apiState } = vi.hoisted(() => ({
  apiState: { current: null as RecordingApi | null },
}));

mockNuxtImport("useApi", () => () => apiState.current!.client);

beforeEach(() => {
  apiState.current = makeRecordingApi();
  apiState.current.respondWith(() => new Response(null, { status: 204 }));
});

function getRecorded() {
  return apiState.current!.requests.map(({ method, url, body }) => ({
    method,
    path: url.pathname,
    body,
  }));
}

describe("useModelInteractions.like / unlike", () => {
  it("POSTs to the model like path without a body", async () => {
    await useModelInteractions().like("model-1");

    expect(getRecorded()).toEqual([
      { method: "POST", path: "/api/v1/models/model-1/like", body: undefined },
    ]);
  });

  it("DELETEs the same path on unlike", async () => {
    await useModelInteractions().unlike("model-1");

    expect(getRecorded()).toEqual([
      { method: "DELETE", path: "/api/v1/models/model-1/like", body: undefined },
    ]);
  });
});

describe("useModelInteractions records", () => {
  it("POSTs body { versionNumber } when version is provided", async () => {
    await useModelInteractions().recordView("model-1", 5);

    expect(getRecorded()).toEqual([
      { method: "POST", path: "/api/v1/models/model-1/views", body: { versionNumber: 5 } },
    ]);
  });

  it("POSTs body {} when versionNumber is undefined", async () => {
    await useModelInteractions().recordView("model-1");

    expect(getRecorded()[0]?.body).toEqual({});
  });

  it("POSTs each kind to its own path", async () => {
    const interactions = useModelInteractions();
    await interactions.recordRun("model-1", 2);
    await interactions.recordDownload("model-1");
    await interactions.recordShare("model-1");

    expect(getRecorded().map((request) => request.path)).toEqual([
      "/api/v1/models/model-1/runs",
      "/api/v1/models/model-1/downloads",
      "/api/v1/models/model-1/shares",
    ]);
  });
});

describe("useModelInteractions failure path", () => {
  it("resolves silently when the request rejects", async () => {
    apiState.current!.respondWith(() => Promise.reject(new Error("network down")));
    const interactions = useModelInteractions();

    await expect(interactions.like("model-1")).resolves.toBeUndefined();
    await expect(interactions.unlike("model-1")).resolves.toBeUndefined();
    await expect(interactions.recordRun("model-1", 2)).resolves.toBeUndefined();
  });

  it("resolves silently when the server refuses", async () => {
    apiState.current!.respondWith(() => new Response(null, { status: 500 }));

    await expect(useModelInteractions().like("model-1")).resolves.toBeUndefined();
  });
});
