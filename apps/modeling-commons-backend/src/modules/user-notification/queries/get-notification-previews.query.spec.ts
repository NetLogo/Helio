import { describe, it, expect, beforeEach, vi } from 'vitest';
import links from '#src/config/links.ts';
import makeFileService from '#src/modules/file/file.service.ts';
import makeGetNotificationPreviewsQuery from '#src/modules/user-notification/queries/get-notification-previews.query.ts';
import { mockUserRepository } from '#src/modules/user/database/user.repository.mock.ts';
import type { ModelPreviewRecord } from '#src/modules/model/database/model.repository.port.ts';
import type { UserNotificationRecord } from '#src/modules/user-notification/database/user-notification.record.ts';

function makeNotification(overrides: Partial<UserNotificationRecord> = {}): UserNotificationRecord {
  return {
    id: 'notification-1',
    recipientId: 'user-1',
    eventId: 'event-1',
    category: 'comment.on_your_model',
    url: 'https://example.test/models/model-1',
    payload: {},
    actorUserId: 'commenter-1',
    targetType: 'model',
    targetId: 'model-1',
    emailSentAt: null,
    readAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as UserNotificationRecord;
}

function makeModelPreviews(
  overrides: Partial<ModelPreviewRecord> = {},
): Map<string, ModelPreviewRecord> {
  const model = { id: 'model-1', title: 'Wolf Sheep', previewImageFileKey: null, ...overrides };
  return new Map([[model.id, model]]);
}

describe('getNotificationPreviewsQuery', () => {
  const userRepository = mockUserRepository();
  const modelService = { getModelPreviewsForViewer: vi.fn() };
  const fileService = makeFileService({
    storage: { send: vi.fn() },
    bucket: { Name: 'test-bucket' },
    storagePublicBaseUrl: 'https://cdn.example.test/test-bucket',
  } as never);
  const previewKey = 'files/public/preview-images/model-1/preview.png';
  const previewUrl = `https://cdn.example.test/test-bucket/${previewKey}`;

  const resolver = makeGetNotificationPreviewsQuery({
    userRepository,
    modelService,
    fileService,
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
    modelService.getModelPreviewsForViewer.mockResolvedValue(
      makeModelPreviews({ previewImageFileKey: previewKey }),
    );
  });

  it('resolves both previews live from the referenced records', async () => {
    const previews = await resolver.execute([makeNotification()], 'user-1');

    expect(previews.get('notification-1')).toEqual({
      actor: {
        name: 'Alice',
        thumbnailUrl: 'https://cdn.example.test/avatars/commenter-1.png',
        url: links.user('commenter-1'),
      },
      target: {
        name: 'Wolf Sheep',
        thumbnailUrl: previewUrl,
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

    await resolver.execute(page, 'user-1');

    expect(userRepository.findAvatarsByIds).toHaveBeenCalledOnce();
    expect(modelService.getModelPreviewsForViewer).toHaveBeenCalledOnce();
  });

  it('reads each repository once for a whole page, deduplicating references', async () => {
    await resolver.execute(
      [
        makeNotification({ id: 'n-1' }),
        makeNotification({ id: 'n-2' }),
        makeNotification({ id: 'n-3', actorUserId: 'commenter-2' }),
      ],
      'user-1',
    );

    expect(userRepository.findAvatarsByIds).toHaveBeenCalledOnce();
    expect(userRepository.findAvatarsByIds).toHaveBeenCalledWith(['commenter-1', 'commenter-2']);
    expect(modelService.getModelPreviewsForViewer).toHaveBeenCalledOnce();
    expect(modelService.getModelPreviewsForViewer).toHaveBeenCalledWith(['model-1'], 'user-1');
  });

  it('names no model the viewer cannot view, but keeps it linkable', async () => {
    modelService.getModelPreviewsForViewer.mockResolvedValue(new Map());

    const previews = await resolver.execute([makeNotification()], 'user-1');

    expect(previews.get('notification-1')!.target).toEqual({
      name: null,
      thumbnailUrl: null,
      url: links.model('model-1'),
    });
  });

  it('keeps the thumbnail of a viewable model whose latest version has no title', async () => {
    modelService.getModelPreviewsForViewer.mockResolvedValue(
      makeModelPreviews({
        title: null,
        previewImageFileKey: previewKey,
      }),
    );

    const previews = await resolver.execute([makeNotification()], 'user-1');

    expect(previews.get('notification-1')!.target).toEqual({
      name: null,
      thumbnailUrl: previewUrl,
      url: links.model('model-1'),
    });
  });

  it('nulls an actor whose user no longer resolves', async () => {
    userRepository.findAvatarsByIds.mockResolvedValue([]);

    const previews = await resolver.execute([makeNotification()], 'user-1');

    expect(previews.get('notification-1')!.actor).toBeNull();
    expect(previews.get('notification-1')!.target).not.toBeNull();
  });

  it('keeps a linkable actor whose user has no name', async () => {
    userRepository.findAvatarsByIds.mockResolvedValue([
      { id: 'commenter-1', name: null, image: null },
    ]);

    const previews = await resolver.execute([makeNotification()], 'user-1');

    expect(previews.get('notification-1')!.actor).toEqual({
      name: null,
      thumbnailUrl: null,
      url: links.user('commenter-1'),
    });
  });

  it('keeps a linkable preview when the referenced record has no image', async () => {
    userRepository.findAvatarsByIds.mockResolvedValue([
      { id: 'commenter-1', name: 'Alice', image: null },
    ]);
    modelService.getModelPreviewsForViewer.mockResolvedValue(makeModelPreviews());

    const previews = await resolver.execute([makeNotification()], 'user-1');

    expect(previews.get('notification-1')).toEqual({
      actor: { name: 'Alice', thumbnailUrl: null, url: links.user('commenter-1') },
      target: { name: 'Wolf Sheep', thumbnailUrl: null, url: links.model('model-1') },
    });
  });

  it('builds the thumbnail of a preview key stored with a doubled public prefix', async () => {
    const doubledKey = 'files/public/files/public/preview-images/model-1/preview.png';
    modelService.getModelPreviewsForViewer.mockResolvedValue(
      makeModelPreviews({ previewImageFileKey: doubledKey }),
    );

    const previews = await resolver.execute([makeNotification()], 'user-1');

    expect(previews.get('notification-1')!.target!.thumbnailUrl).toBe(
      `https://cdn.example.test/test-bucket/${doubledKey}`,
    );
  });

  it('shows no thumbnail for a preview key outside the public prefix, but keeps the name', async () => {
    modelService.getModelPreviewsForViewer.mockResolvedValue(
      makeModelPreviews({ previewImageFileKey: 'preview-images/model-1/preview.png' }),
    );

    const previews = await resolver.execute([makeNotification()], 'user-1');

    expect(previews.get('notification-1')!.target).toEqual({
      name: 'Wolf Sheep',
      thumbnailUrl: null,
      url: links.model('model-1'),
    });
  });

  it('shows the new names of a renamed user and model on the next call', async () => {
    await resolver.execute([makeNotification()], 'user-1');
    userRepository.findAvatarsByIds.mockResolvedValue([
      { id: 'commenter-1', name: 'Alicia', image: null },
    ]);
    modelService.getModelPreviewsForViewer.mockResolvedValue(
      makeModelPreviews({ title: 'Wolf Sheep Predation' }),
    );

    const previews = await resolver.execute([makeNotification()], 'user-1');

    expect(previews.get('notification-1')!.actor!.name).toBe('Alicia');
    expect(previews.get('notification-1')!.target!.name).toBe('Wolf Sheep Predation');
  });

  it('touches no repository for a page with no references', async () => {
    const previews = await resolver.execute(
      [makeNotification({ actorUserId: null, targetType: null, targetId: null })],
      'user-1',
    );

    expect(userRepository.findAvatarsByIds).toHaveBeenCalledWith([]);
    expect(modelService.getModelPreviewsForViewer).toHaveBeenCalledWith([], 'user-1');
    expect(previews.get('notification-1')).toEqual({ actor: null, target: null });
  });

  it('returns an empty map for an empty page', async () => {
    const previews = await resolver.execute([], 'user-1');

    expect(previews.size).toBe(0);
    expect(userRepository.findAvatarsByIds).not.toHaveBeenCalled();
  });
});
