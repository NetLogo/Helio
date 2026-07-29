import { describe, it, expect, beforeEach, vi } from 'vitest';
import links from '#src/config/links.ts';
import makeResolveNotificationSubjectsQuery from '#src/modules/user-notification/queries/resolve-notification-subjects.query.ts';
import { mockUserRepository } from '#src/modules/user/database/user.repository.mock.ts';
import { mockModelRepository } from '#src/modules/model/database/model.repository.mock.ts';
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

describe('resolveNotificationSubjectsQuery', () => {
  const userRepository = mockUserRepository();
  const modelRepository = mockModelRepository();
  const fileService = { getUrl: vi.fn() };
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };

  const resolver = makeResolveNotificationSubjectsQuery({
    userRepository,
    modelRepository,
    fileService,
    logger,
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
    userRepository.findAvatarsByIds.mockResolvedValue([
      { id: 'commenter-1', image: 'https://cdn.example.test/avatars/commenter-1.png' },
    ]);
    modelRepository.findLatestPreviewKeys.mockResolvedValue([
      { id: 'model-1', previewImageFileKey: 'public/preview-images/model-1/preview.png' },
    ]);
    fileService.getUrl.mockResolvedValue('https://cdn.example.test/previews/model-1.png');
  });

  it('resolves both subjects live from the referenced records', async () => {
    const subjects = await resolver.execute([makeNotification()]);

    expect(subjects.get('notification-1')).toEqual({
      actor: {
        thumbnailUrl: 'https://cdn.example.test/avatars/commenter-1.png',
        url: links.user('commenter-1'),
      },
      target: {
        thumbnailUrl: 'https://cdn.example.test/previews/model-1.png',
        url: links.model('model-1'),
      },
    });
  });

  it('reads each repository once for a whole page, deduplicating references', async () => {
    await resolver.execute([
      makeNotification({ id: 'n-1' }),
      makeNotification({ id: 'n-2' }),
      makeNotification({ id: 'n-3', actorUserId: 'commenter-2' }),
    ]);

    expect(userRepository.findAvatarsByIds).toHaveBeenCalledOnce();
    expect(modelRepository.findLatestPreviewKeys).toHaveBeenCalledOnce();
    expect(userRepository.findAvatarsByIds).toHaveBeenCalledWith(['commenter-1', 'commenter-2']);
    expect(modelRepository.findLatestPreviewKeys).toHaveBeenCalledWith(['model-1']);
  });

  it('nulls an actor whose user no longer resolves', async () => {
    userRepository.findAvatarsByIds.mockResolvedValue([]);

    const subjects = await resolver.execute([makeNotification()]);

    expect(subjects.get('notification-1')!.actor).toBeNull();
    expect(subjects.get('notification-1')!.target).not.toBeNull();
  });

  it('nulls a target whose model no longer resolves', async () => {
    modelRepository.findLatestPreviewKeys.mockResolvedValue([]);

    const subjects = await resolver.execute([makeNotification()]);

    expect(subjects.get('notification-1')!.target).toBeNull();
  });

  it('keeps a linkable subject when the referenced record has no image', async () => {
    userRepository.findAvatarsByIds.mockResolvedValue([{ id: 'commenter-1', image: null }]);
    modelRepository.findLatestPreviewKeys.mockResolvedValue([
      { id: 'model-1', previewImageFileKey: null },
    ]);

    const subjects = await resolver.execute([makeNotification()]);

    expect(subjects.get('notification-1')).toEqual({
      actor: { thumbnailUrl: null, url: links.user('commenter-1') },
      target: { thumbnailUrl: null, url: links.model('model-1') },
    });
    expect(fileService.getUrl).not.toHaveBeenCalled();
  });

  it('still links the target when signing its thumbnail fails', async () => {
    fileService.getUrl.mockRejectedValue(new Error('storage down'));

    const subjects = await resolver.execute([makeNotification()]);

    expect(subjects.get('notification-1')!.target).toEqual({
      thumbnailUrl: null,
      url: links.model('model-1'),
    });
    expect(logger.error).toHaveBeenCalled();
  });

  it('touches no repository for a page with no references', async () => {
    const subjects = await resolver.execute([
      makeNotification({ actorUserId: null, targetType: null, targetId: null }),
    ]);

    expect(userRepository.findAvatarsByIds).toHaveBeenCalledWith([]);
    expect(modelRepository.findLatestPreviewKeys).toHaveBeenCalledWith([]);
    expect(subjects.get('notification-1')).toEqual({ actor: null, target: null });
  });

  it('returns an empty map for an empty page', async () => {
    const subjects = await resolver.execute([]);

    expect(subjects.size).toBe(0);
    expect(userRepository.findAvatarsByIds).not.toHaveBeenCalled();
  });
});
