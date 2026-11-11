import type { StreamTopic } from "~/features/server-stream/types";

export async function requestSubscription(
  connectionId: string,
  topic: StreamTopic,
): Promise<number> {
  const { response } = await useApi().POST("/api/v1/events/subscriptions", {
    body: { connectionId, topic },
  });
  return response.status;
}

export async function cancelSubscription(connectionId: string, topic: StreamTopic): Promise<void> {
  await useApi().DELETE("/api/v1/events/subscriptions", { body: { connectionId, topic } });
}
