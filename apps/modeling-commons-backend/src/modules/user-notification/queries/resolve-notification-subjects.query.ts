import links from '#src/config/links.ts';
import type { UserNotificationRecord } from '#src/modules/user-notification/database/user-notification.record.ts';
import type {
  NotificationSubject,
  ResolvedNotificationSubjects,
} from '#src/modules/user-notification/domain/user-notification.types.ts';

function uniqueIds(values: Array<string | null>): Array<string> {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export default function makeResolveNotificationSubjectsQuery({
  userRepository,
  modelRepository,
  fileService,
  logger,
}: Dependencies) {
  return {
    // Two batched reads for a whole page, whatever the page size. A reference that no
    // longer resolves - deleted user, deleted model - yields null rather than a dead link.
    async execute(
      records: Array<UserNotificationRecord>,
    ): Promise<Map<string, ResolvedNotificationSubjects>> {
      const empty = new Map<string, ResolvedNotificationSubjects>(
        records.map((record) => [record.id, { actor: null, target: null }]),
      );
      if (records.length === 0) return empty;

      const actorIds = uniqueIds(records.map((record) => record.actorUserId));
      const modelIds = uniqueIds(
        records.map((record) => (record.targetType === 'model' ? record.targetId : null)),
      );

      const [avatars, previews] = await Promise.all([
        userRepository.findAvatarsByIds(actorIds),
        modelRepository.findLatestPreviewKeys(modelIds),
      ]);

      const actors = new Map<string, NotificationSubject>(
        avatars.map((avatar) => [
          avatar.id,
          { thumbnailUrl: avatar.image, url: links.user(avatar.id) },
        ]),
      );

      const targets = new Map<string, NotificationSubject>(
        await Promise.all(
          previews.map(async (preview) => {
            const thumbnailUrl = preview.previewImageFileKey
              ? await fileService.getUrl(preview.previewImageFileKey).catch((error: unknown) => {
                  logger.error({
                    name: 'ResolveNotificationSubjects',
                    message: 'Failed to resolve a model thumbnail for the feed',
                    error,
                  });
                  return null;
                })
              : null;
            return [preview.id, { thumbnailUrl, url: links.model(preview.id) }] as const;
          }),
        ),
      );

      return new Map(
        records.map((record) => [
          record.id,
          {
            actor: record.actorUserId ? (actors.get(record.actorUserId) ?? null) : null,
            target:
              record.targetType === 'model' && record.targetId
                ? (targets.get(record.targetId) ?? null)
                : null,
          },
        ]),
      );
    },
  };
}
