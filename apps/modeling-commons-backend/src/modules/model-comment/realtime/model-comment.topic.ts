import { modelCommentEventTypes } from '#src/modules/event/domain/event-types.ts';
import { policy } from '#src/shared/permissions/model-access.policy.ts';
import { loadModelAccessContext } from '#src/shared/permissions/model-access.viewer.ts';
import type { RealtimeTopic } from '#src/shared/realtime/realtime-topic.ts';

export const modelCommentTopic = {
  type: 'model',
  events: Object.values(modelCommentEventTypes),
  getTopic: (event) => ({ type: 'model', id: event.resourceId }),
  canSubscribe: async ({ db }, viewerId, id) =>
    policy.read(await loadModelAccessContext(db, viewerId, id)),
} as const satisfies RealtimeTopic<'model'>;
