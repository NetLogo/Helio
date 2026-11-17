import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchNotifications, pollNotifications } from "~/features/notifications/api";
import {
  jsonResponse,
  makeNotificationPage,
  makeRecordingApi,
  type RecordingApi,
} from "~~/tests/helpers/notifications";

const { apiState } = vi.hoisted(() => ({
  apiState: { current: null as RecordingApi | null },
}));

mockNuxtImport("useApi", () => () => apiState.current!.client);

beforeEach(() => {
  apiState.current = makeRecordingApi();
  apiState.current.respondWith(() => jsonResponse(makeNotificationPage([])));
});

const sentQuery = () => Object.fromEntries(apiState.current!.requests[0]!.url.searchParams);

describe("fetchNotifications", () => {
  it("sends page and limit without unreadOnly by default", async () => {
    await fetchNotifications(2, 20);

    expect(sentQuery()).toEqual({ page: "2", limit: "20" });
  });

  it("adds unreadOnly=true when asked for unread only", async () => {
    await fetchNotifications(0, 20, true);

    expect(sentQuery()).toEqual({ page: "0", limit: "20", unreadOnly: "true" });
  });
});

describe("pollNotifications", () => {
  it("sends only the limit when there is no cursor", async () => {
    await pollNotifications();

    expect(sentQuery()).toEqual({ limit: "100" });
  });

  it("sends the cursor as since", async () => {
    await pollNotifications("2026-10-01T12:00:00.000Z");

    expect(sentQuery()).toEqual({ since: "2026-10-01T12:00:00.000Z", limit: "100" });
  });
});
