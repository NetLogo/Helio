import createClient from "openapi-fetch";
import { vi } from "vitest";
import type { Notification, NotificationResponse } from "~/components/notifications/shared";
import type { paths } from "~~/shared/types/api";

export function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "n-1",
    category: "comment.on_your_model",
    title: "New comment",
    body: "Nice model",
    url: "https://mc.test/models/m-1/comments/c-1",
    actor: {
      name: "Ada Lovelace",
      thumbnailUrl: "http://cdn.test/ada.png",
      url: "https://mc.test/users/ada",
    },
    target: {
      name: "Wolf Sheep",
      thumbnailUrl: "http://cdn.test/wolf.png",
      url: "https://mc.test/models/m-1",
    },
    createdAt: "2026-10-01T12:00:00.000Z",
    readAt: null,
    ...overrides,
  };
}

export function makeNotificationPage(
  data: Notification[],
  overrides: Partial<NotificationResponse> = {},
): NotificationResponse {
  return {
    count: data.length,
    limit: 20,
    page: 0,
    data,
    unreadCount: data.filter((n) => n.readAt === null).length,
    ...overrides,
  };
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export type RecordedRequest = { method: string; url: URL; body: unknown };
type Responder = (request: RecordedRequest) => Response | Promise<Response>;

export function makeRecordingApi(baseUrl = "http://api.test") {
  const requests: RecordedRequest[] = [];
  let responder: Responder = () => jsonResponse({ message: "unhandled" }, 500);

  const fetch = vi.fn(async (request: Request) => {
    const text = await request.clone().text();
    const recorded = {
      method: request.method,
      url: new URL(request.url),
      body: text ? JSON.parse(text) : undefined,
    };
    requests.push(recorded);
    return responder(recorded);
  });

  const client = createClient<paths>({ baseUrl, fetch });

  return {
    client,
    requests,
    respondWith(next: Responder) {
      responder = next;
    },
  };
}

export type RecordingApi = ReturnType<typeof makeRecordingApi>;
