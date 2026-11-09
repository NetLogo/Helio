import links from '#src/config/links.ts';
import type { ModelPreviewRecord } from '#src/modules/model/database/model.repository.port.ts';
import type { UserNotificationRecord } from '#src/modules/user-notification/database/user-notification.record.ts';
import type {
  NotificationPreview,
  NotificationPreviews,
} from '#src/modules/user-notification/domain/user-notification.types.ts';
import type { UserAvatarRecord } from '#src/modules/user/database/user.repository.port.ts';
import { collectUniqueDefined } from '#src/shared/utils/collections.ts';

type NotificationSubjectReference = Pick<
  UserNotificationRecord,
  'id' | 'actorUserId' | 'targetType' | 'targetId'
>;

function collectActorIds(references: ReadonlyArray<NotificationSubjectReference>): Array<string> {
  return collectUniqueDefined(references.map((reference) => reference.actorUserId));
}

function getModelId(reference: NotificationSubjectReference): string | null {
  return reference.targetType === 'model' ? reference.targetId : null;
}

function collectModelIds(references: ReadonlyArray<NotificationSubjectReference>): Array<string> {
  return collectUniqueDefined(references.map(getModelId));
}

function mapAvatarToActorPreview(avatar: UserAvatarRecord): NotificationPreview {
  return { name: avatar.name, thumbnailUrl: avatar.image, url: links.user(avatar.id) };
}

function mapAvatarsToActorPreviews(
  avatars: Array<UserAvatarRecord>,
): Map<string, NotificationPreview> {
  return new Map(avatars.map((avatar) => [avatar.id, mapAvatarToActorPreview(avatar)]));
}

function attachPreviewsToNotifications(
  references: ReadonlyArray<NotificationSubjectReference>,
  actorPreviews: Map<string, NotificationPreview>,
  targetPreviews: Map<string, NotificationPreview>,
): Map<string, NotificationPreviews> {
  return new Map(
    references.map((reference) => {
      const modelId = getModelId(reference);
      return [
        reference.id,
        {
          actor: reference.actorUserId ? (actorPreviews.get(reference.actorUserId) ?? null) : null,
          target: modelId ? (targetPreviews.get(modelId) ?? null) : null,
        },
      ];
    }),
  );
}

/*
  Resolves each notification's actor and target to a preview suitable for the
  viewer, enforcing view permissions for each subject.
*/
export default function makeGetNotificationPreviewsQuery({
  userRepository,
  modelService,
  fileService,
}: Dependencies) {
  function mapModelToTargetPreview(
    modelId: string,
    model: ModelPreviewRecord | undefined,
  ): NotificationPreview {
    const url = links.model(modelId);
    if (!model) return { name: null, thumbnailUrl: null, url };
    return {
      name: model.title,
      thumbnailUrl: model.previewImageFileKey
        ? fileService.getPublicUrl(model.previewImageFileKey)
        : null,
      url,
    };
  }

  function mapModelsToTargetPreviews(
    modelIds: Array<string>,
    models: Map<string, ModelPreviewRecord>,
  ): Map<string, NotificationPreview> {
    return new Map(
      modelIds.map((modelId) => [modelId, mapModelToTargetPreview(modelId, models.get(modelId))]),
    );
  }

  return {
    async execute(
      references: ReadonlyArray<NotificationSubjectReference>,
      viewerId: string,
    ): Promise<Map<string, NotificationPreviews>> {
      if (references.length === 0) return new Map();

      const modelIds = collectModelIds(references);
      const [avatars, models] = await Promise.all([
        userRepository.findAvatarsByIds(collectActorIds(references)),
        modelService.getModelPreviewsForViewer(modelIds, viewerId),
      ]);

      return attachPreviewsToNotifications(
        references,
        mapAvatarsToActorPreviews(avatars),
        mapModelsToTargetPreviews(modelIds, models),
      );
    },
  };
}
