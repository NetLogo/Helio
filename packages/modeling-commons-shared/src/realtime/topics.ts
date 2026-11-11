export type StreamTopic = { type: 'model'; id: string } | { type: 'user'; id: string }

export type StreamTopicType = StreamTopic['type']

export type StreamTopicEvents = {
  model: 'model_comment.created' | 'model_comment.updated' | 'model_comment.deleted'
  user: 'user_notification.created'
}

export type StreamEvent<T extends StreamTopicType = StreamTopicType> = StreamTopicEvents[T]

export type StreamMessage = {
  [T in StreamTopicType]: { topic: Extract<StreamTopic, { type: T }>; event: StreamEvent<T> }
}[StreamTopicType]

export type StreamControlMessage = { event: 'resync' } | { event: 'connection'; connectionId: string }

export function buildTopicKey(topic: StreamTopic): string {
  return `${topic.type}:${topic.id}`
}
