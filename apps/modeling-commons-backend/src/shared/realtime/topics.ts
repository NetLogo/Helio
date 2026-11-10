import realtimeConfig, { type RealtimeEvent } from '#src/config/realtime.ts';

const { channels, events, topicPrefixes } = realtimeConfig;

export type RealtimeSignal = { topic: string; event: RealtimeEvent };

export function buildModelTopic(modelId: string): string {
  return `${topicPrefixes.model}:${modelId}`;
}

export function buildUserTopic(userId: string): string {
  return `${topicPrefixes.user}:${userId}`;
}

export function resolveChannelSignal(
  channel: string,
  payload: string | undefined,
): RealtimeSignal | null {
  if (!payload) return null;
  if (channel === channels.model)
    return { topic: buildModelTopic(payload), event: events.comments };
  if (channel === channels.user) {
    return { topic: buildUserTopic(payload), event: events.notifications };
  }
  return null;
}
