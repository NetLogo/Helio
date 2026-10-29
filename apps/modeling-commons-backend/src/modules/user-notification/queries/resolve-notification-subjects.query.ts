import links from '#src/config/links.ts';
import type { ModelSubjectRecord } from '#src/modules/model/database/model.repository.port.ts';
import type { UserNotificationRecord } from '#src/modules/user-notification/database/user-notification.record.ts';
import type {
  NotificationSubject,
  ResolvedNotificationSubjects,
} from '#src/modules/user-notification/domain/user-notification.types.ts';
import type { UserAvatarRecord } from '#src/modules/user/database/user.repository.port.ts';
import { collectUniqueDefined } from '#src/shared/utils/collections.ts';

type SubjectReference = Pick<
  UserNotificationRecord,
  'id' | 'actorUserId' | 'targetType' | 'targetId'
>;

type ResolveOptions = { includeThumbnails: boolean };

function collectActorIds(records: ReadonlyArray<SubjectReference>): Array<string> {
  return collectUniqueDefined(records.map((record) => record.actorUserId));
}

function getModelId(record: SubjectReference): string | null {
  return record.targetType === 'model' ? record.targetId : null;
}

function collectModelIds(records: ReadonlyArray<SubjectReference>): Array<string> {
  return collectUniqueDefined(records.map(getModelId));
}

function resolveActors(avatars: Array<UserAvatarRecord>): Map<string, NotificationSubject> {
  return new Map(
    avatars.map((avatar) => [
      avatar.id,
      { name: avatar.name, thumbnailUrl: avatar.image, url: links.user(avatar.id) },
    ]),
  );
}

function assembleSubjects(
  records: ReadonlyArray<SubjectReference>,
  actors: Map<string, NotificationSubject>,
  targets: Map<string, NotificationSubject>,
): Map<string, ResolvedNotificationSubjects> {
  return new Map(
    records.map((record) => {
      const modelId = getModelId(record);
      return [
        record.id,
        {
          actor: record.actorUserId ? (actors.get(record.actorUserId) ?? null) : null,
          target: modelId ? (targets.get(modelId) ?? null) : null,
        },
      ];
    }),
  );
}

// Resolves each notification's actor and target to what the viewer may see now: name, thumbnail and link.
export default function makeResolveNotificationSubjectsQuery({
  userRepository,
  modelService,
  fileService,
  logger,
}: Dependencies) {
  async function resolveThumbnail(fileKey: string | null): Promise<string | null> {
    if (!fileKey) return null;
    return fileService.getUrl(fileKey).catch((error: unknown) => {
      logger.error({
        name: 'ResolveNotificationSubjects',
        message: 'Failed to resolve a model thumbnail for the feed',
        error,
      });
      return null;
    });
  }

  async function resolveTarget(
    modelId: string,
    model: ModelSubjectRecord | undefined,
    { includeThumbnails }: ResolveOptions,
  ): Promise<NotificationSubject> {
    const url = links.model(modelId);
    if (!model) return { name: null, thumbnailUrl: null, url };
    return {
      name: model.title,
      thumbnailUrl: includeThumbnails ? await resolveThumbnail(model.previewImageFileKey) : null,
      url,
    };
  }

  async function resolveTargets(
    modelIds: Array<string>,
    models: Map<string, ModelSubjectRecord>,
    options: ResolveOptions,
  ): Promise<Map<string, NotificationSubject>> {
    const entries = await Promise.all(
      modelIds.map(
        async (modelId) =>
          [modelId, await resolveTarget(modelId, models.get(modelId), options)] as const,
      ),
    );
    return new Map(entries);
  }

  return {
    async execute(
      records: ReadonlyArray<SubjectReference>,
      viewerId: string,
      options: ResolveOptions,
    ): Promise<Map<string, ResolvedNotificationSubjects>> {
      if (records.length === 0) return new Map();

      const modelIds = collectModelIds(records);
      const [avatars, models] = await Promise.all([
        userRepository.findAvatarsByIds(collectActorIds(records)),
        modelService.getModelSubjectsForViewer(modelIds, viewerId),
      ]);

      return assembleSubjects(
        records,
        resolveActors(avatars),
        await resolveTargets(modelIds, models, options),
      );
    },
  };
}
