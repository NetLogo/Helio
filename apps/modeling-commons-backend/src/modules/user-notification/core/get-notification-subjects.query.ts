import links from '#src/config/links.ts';
import { lookup } from '#src/shared/utils/collections.ts';
import type {
  Notification,
  NotificationLinkPreview,
  SubjectsByNotificationId,
} from '#src/modules/user-notification/core/types/index.ts';
import {
  collectActorIds,
  collectModelIds,
  getTargetModelId,
  makeSubjectsByNotificationId,
  toActorPreview,
} from '#src/modules/user-notification/core/subjects.domain.ts';

export default function makeGetNotificationSubjectsQuery({
  userRepository,
  modelService,
  fileService,
}: Dependencies) {
  return {
    async execute(
      notifications: ReadonlyArray<
        Pick<Notification, 'id' | 'actorId' | 'targetType' | 'targetId'>
      >,
      viewerId: string,
    ): Promise<SubjectsByNotificationId> {
      if (notifications.length === 0) return makeSubjectsByNotificationId([]);

      const [avatars, models] = await Promise.all([
        userRepository.findAvatarsByIds(collectActorIds(notifications)),
        modelService.getModelPreviewsForViewer(collectModelIds(notifications), viewerId),
      ]);

      const actors = new Map(avatars.map((avatar) => [avatar.id, toActorPreview(avatar)]));
      const targets = new Map<string, NotificationLinkPreview>();
      for (const [modelId, model] of models) {
        targets.set(modelId, {
          name: model.title,
          thumbnailUrl: model.previewImageFileKey
            ? fileService.getPublicUrl(model.previewImageFileKey)
            : null,
          url: links.model(modelId),
        });
      }

      return makeSubjectsByNotificationId(
        notifications.map((notification) => {
          const modelId = getTargetModelId(notification);
          return [
            notification.id,
            {
              actor: lookup(actors, notification.actorId),
              target: lookup(targets, modelId),
            },
          ];
        }),
      );
    },
  };
}
