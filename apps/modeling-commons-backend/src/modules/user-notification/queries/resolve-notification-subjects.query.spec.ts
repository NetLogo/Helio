import { describe, it, expect, beforeEach, vi } from 'vitest';
import links from '#src/config/links.ts';
import makeResolveNotificationSubjectsQuery from '#src/modules/user-notification/queries/resolve-notification-subjects.query.ts';
import { mockUserRepository } from '#src/modules/user/database/user.repository.mock.ts';
import type { ModelSubjectRecord } from '#src/modules/model/database/model.repository.port.ts';
import type { UserNotificationRecord } from '#src/modules/user-notification/database/user-notification.record.ts';

function makeNotification(overrides: Partial<UserNotificationRecord> = {}): UserNotificationRecord {
  return {
    id: 'notification-1',
    recipientId: 'user-1',
    eventId: 'event-1',
    category: 'comment.on_your_model',
    title: 'New comment',
    body: 'Someone commented',
    url: 'https://example.test/models/model-1',
    actorUserId: 'commenter-1',
    targetType: 'model',
    targetId: 'model-1',
    emailSentAt: null,
    readAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as UserNotificationRecord;
}

function makeModelSubjects(
  overrides: Partial<ModelSubjectRecord> = {},
): Map<string, ModelSubjectRecord> {
  const model = { id: 'model-1', title: 'Wolf Sheep', previewImageFileKey: null, ...overrides };
  return new Map([[model.id, model]]);
}

describe('resolveNotificationSubjectsQuery', () => {
  const userRepository = mockUserRepository();
  const modelService = { getModelSubjectsForViewer: vi.fn() };
  const fileService = { getUrl: vi.fn() };
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
  const withThumbnails = { includeThumbnails: true };

  const resolver = makeResolveNotificationSubjectsQuery({
    userRepository,
    modelService,
    fileService,
    logger,
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
    userRepository.findAvatarsByIds.mockResolvedValue([
      {
        id: 'commenter-1',
        name: 'Alice',
        image: 'https://cdn.example.test/avatars/commenter-1.png',
      },
    ]);
    modelService.getModelSubjectsForViewer.mockResolvedValue(
      makeModelSubjects({ previewImageFileKey: 'public/preview-images/model-1/preview.png' }),
    );
    fileService.getUrl.mockResolvedValue('https://cdn.example.test/previews/model-1.png');
  });

  it('resolves both subjects live from the referenced records', async () => {
    const subjects = await resolver.execute([makeNotification()], 'user-1', withThumbnails);

    expect(subjects.get('notification-1')).toEqual({
      actor: {
        name: 'Alice',
        thumbnailUrl: 'https://cdn.example.test/avatars/commenter-1.png',
        url: links.user('commenter-1'),
      },
      target: {
        name: 'Wolf Sheep',
        thumbnailUrl: 'https://cdn.example.test/previews/model-1.png',
        url: links.model('model-1'),
      },
    });
  });

  it('reads each repository once however large the page is', async () => {
    const page = Array.from({ length: 50 }, (_, index) =>
      makeNotification({
        id: `n-${index}`,
        actorUserId: `commenter-${index}`,
        targetId: `model-${index}`,
      }),
    );

    await resolver.execute(page, 'user-1', withThumbnails);

    expect(userRepository.findAvatarsByIds).toHaveBeenCalledOnce();
    expect(modelService.getModelSubjectsForViewer).toHaveBeenCalledOnce();
  });

  it('reads each repository once for a whole page, deduplicating references', async () => {
    await resolver.execute(
      [
        makeNotification({ id: 'n-1' }),
        makeNotification({ id: 'n-2' }),
        makeNotification({ id: 'n-3', actorUserId: 'commenter-2' }),
      ],
      'user-1',
      withThumbnails,
    );

    expect(userRepository.findAvatarsByIds).toHaveBeenCalledOnce();
    expect(userRepository.findAvatarsByIds).toHaveBeenCalledWith(['commenter-1', 'commenter-2']);
    expect(modelService.getModelSubjectsForViewer).toHaveBeenCalledOnce();
    expect(modelService.getModelSubjectsForViewer).toHaveBeenCalledWith(['model-1'], 'user-1');
  });

  it('names no model the viewer cannot view, but keeps it linkable', async () => {
    modelService.getModelSubjectsForViewer.mockResolvedValue(new Map());

    const subjects = await resolver.execute([makeNotification()], 'user-1', withThumbnails);

    expect(subjects.get('notification-1')!.target).toEqual({
      name: null,
      thumbnailUrl: null,
      url: links.model('model-1'),
    });
    expect(fileService.getUrl).not.toHaveBeenCalled();
  });

  it('keeps the thumbnail of a viewable model whose latest version has no title', async () => {
    modelService.getModelSubjectsForViewer.mockResolvedValue(
      makeModelSubjects({
        title: null,
        previewImageFileKey: 'public/preview-images/model-1/preview.png',
      }),
    );

    const subjects = await resolver.execute([makeNotification()], 'user-1', withThumbnails);

    expect(subjects.get('notification-1')!.target).toEqual({
      name: null,
      thumbnailUrl: 'https://cdn.example.test/previews/model-1.png',
      url: links.model('model-1'),
    });
  });

  it('nulls an actor whose user no longer resolves', async () => {
    userRepository.findAvatarsByIds.mockResolvedValue([]);

    const subjects = await resolver.execute([makeNotification()], 'user-1', withThumbnails);

    expect(subjects.get('notification-1')!.actor).toBeNull();
    expect(subjects.get('notification-1')!.target).not.toBeNull();
  });

  it('keeps a linkable actor whose user has no name', async () => {
    userRepository.findAvatarsByIds.mockResolvedValue([
      { id: 'commenter-1', name: null, image: null },
    ]);

    const subjects = await resolver.execute([makeNotification()], 'user-1', withThumbnails);

    expect(subjects.get('notification-1')!.actor).toEqual({
      name: null,
      thumbnailUrl: null,
      url: links.user('commenter-1'),
    });
  });

  it('keeps a linkable subject when the referenced record has no image', async () => {
    userRepository.findAvatarsByIds.mockResolvedValue([
      { id: 'commenter-1', name: 'Alice', image: null },
    ]);
    modelService.getModelSubjectsForViewer.mockResolvedValue(makeModelSubjects());

    const subjects = await resolver.execute([makeNotification()], 'user-1', withThumbnails);

    expect(subjects.get('notification-1')).toEqual({
      actor: { name: 'Alice', thumbnailUrl: null, url: links.user('commenter-1') },
      target: { name: 'Wolf Sheep', thumbnailUrl: null, url: links.model('model-1') },
    });
    expect(fileService.getUrl).not.toHaveBeenCalled();
  });

  it('still links the target when signing its thumbnail fails', async () => {
    fileService.getUrl.mockRejectedValue(new Error('storage down'));

    const subjects = await resolver.execute([makeNotification()], 'user-1', withThumbnails);

    expect(subjects.get('notification-1')!.target).toEqual({
      name: 'Wolf Sheep',
      thumbnailUrl: null,
      url: links.model('model-1'),
    });
    expect(logger.error).toHaveBeenCalled();
  });

  it('touches no repository for a page with no references', async () => {
    const subjects = await resolver.execute(
      [makeNotification({ actorUserId: null, targetType: null, targetId: null })],
      'user-1',
      withThumbnails,
    );

    expect(userRepository.findAvatarsByIds).toHaveBeenCalledWith([]);
    expect(modelService.getModelSubjectsForViewer).toHaveBeenCalledWith([], 'user-1');
    expect(subjects.get('notification-1')).toEqual({ actor: null, target: null });
  });

  it('signs no thumbnail when the caller does not want thumbnails', async () => {
    const subjects = await resolver.execute([makeNotification()], 'user-1', {
      includeThumbnails: false,
    });

    expect(subjects.get('notification-1')!.target).toEqual({
      name: 'Wolf Sheep',
      thumbnailUrl: null,
      url: links.model('model-1'),
    });
    expect(fileService.getUrl).not.toHaveBeenCalled();
  });

  it('returns an empty map for an empty page', async () => {
    const subjects = await resolver.execute([], 'user-1', withThumbnails);

    expect(subjects.size).toBe(0);
    expect(userRepository.findAvatarsByIds).not.toHaveBeenCalled();
  });
});
