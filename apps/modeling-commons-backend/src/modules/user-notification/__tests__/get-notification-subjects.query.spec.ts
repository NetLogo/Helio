import { describe, it, expect, beforeEach, vi } from 'vitest';
import links from '#src/config/links.ts';
import makeFileService from '#src/modules/file/file.service.ts';
import makeGetNotificationSubjectsQuery from '#src/modules/user-notification/core/get-notification-subjects.query.ts';
import type { ModelPreviewRecord } from '#src/modules/model/database/model.repository.port.ts';
import type { UserNotificationRecord } from '#src/modules/user-notification/core/database/user-notification.record.ts';
import { mockPort } from '#src/shared/test/mock-port.ts';
import type { UserRepository } from '#src/modules/user/database/user.repository.port.ts';

function makeNotification(overrides: Partial<UserNotificationRecord> = {}): UserNotificationRecord {
  return {
    id: 'notification-1',
    recipientId: 'user-1',
    eventId: 'event-1',
    category: 'comment.on_your_model',
    url: 'https://example.test/models/model-1',
    payload: {},
    actorId: 'commenter-1',
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

describe('getNotificationSubjectsQuery', () => {
  const userRepository = mockPort<UserRepository>();
  const modelService = { getModelPreviewsForViewer: vi.fn() };
  const fileService = makeFileService({
    storage: { send: vi.fn() },
    bucket: { Name: 'test-bucket' },
    storagePublicBaseUrl: 'https://cdn.example.test/test-bucket',
  } as never);
  const previewKey = 'files/public/preview-images/model-1/preview.png';
  const previewUrl = `https://cdn.example.test/test-bucket/${previewKey}`;

  const resolver = makeGetNotificationSubjectsQuery({
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

  it('resolves both subjects live from the referenced records', async () => {
    const subjects = await resolver.execute([makeNotification()], 'user-1');

    expect(subjects.of('notification-1')).toEqual({
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
        actorId: `commenter-${index}`,
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
        makeNotification({ id: 'n-3', actorId: 'commenter-2' }),
      ],
      'user-1',
    );

    expect(userRepository.findAvatarsByIds).toHaveBeenCalledOnce();
    expect(userRepository.findAvatarsByIds).toHaveBeenCalledWith(['commenter-1', 'commenter-2']);
    expect(modelService.getModelPreviewsForViewer).toHaveBeenCalledOnce();
    expect(modelService.getModelPreviewsForViewer).toHaveBeenCalledWith(['model-1'], 'user-1');
  });

  it('yields no target for a model the viewer cannot view', async () => {
    modelService.getModelPreviewsForViewer.mockResolvedValue(new Map());

    const subjects = await resolver.execute([makeNotification()], 'user-1');

    expect(subjects.of('notification-1')!.target).toBeNull();
  });

  it('keeps the thumbnail of a viewable model whose latest version has no title', async () => {
    modelService.getModelPreviewsForViewer.mockResolvedValue(
      makeModelPreviews({
        title: null,
        previewImageFileKey: previewKey,
      }),
    );

    const subjects = await resolver.execute([makeNotification()], 'user-1');

    expect(subjects.of('notification-1')!.target).toEqual({
      name: null,
      thumbnailUrl: previewUrl,
      url: links.model('model-1'),
    });
  });

  it('nulls an actor whose user no longer resolves', async () => {
    userRepository.findAvatarsByIds.mockResolvedValue([]);

    const subjects = await resolver.execute([makeNotification()], 'user-1');

    expect(subjects.of('notification-1')!.actor).toBeNull();
    expect(subjects.of('notification-1')!.target).not.toBeNull();
  });

  it('keeps a linkable actor whose user has no name', async () => {
    userRepository.findAvatarsByIds.mockResolvedValue([
      { id: 'commenter-1', name: null, image: null },
    ]);

    const subjects = await resolver.execute([makeNotification()], 'user-1');

    expect(subjects.of('notification-1')!.actor).toEqual({
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

    const subjects = await resolver.execute([makeNotification()], 'user-1');

    expect(subjects.of('notification-1')).toEqual({
      actor: { name: 'Alice', thumbnailUrl: null, url: links.user('commenter-1') },
      target: { name: 'Wolf Sheep', thumbnailUrl: null, url: links.model('model-1') },
    });
  });

  it('builds the thumbnail of a preview key stored with a doubled public prefix', async () => {
    const doubledKey = 'files/public/files/public/preview-images/model-1/preview.png';
    modelService.getModelPreviewsForViewer.mockResolvedValue(
      makeModelPreviews({ previewImageFileKey: doubledKey }),
    );

    const subjects = await resolver.execute([makeNotification()], 'user-1');

    expect(subjects.of('notification-1')!.target!.thumbnailUrl).toBe(
      `https://cdn.example.test/test-bucket/${doubledKey}`,
    );
  });

  it('shows no thumbnail for a preview key outside the public prefix, but keeps the name', async () => {
    modelService.getModelPreviewsForViewer.mockResolvedValue(
      makeModelPreviews({ previewImageFileKey: 'preview-images/model-1/preview.png' }),
    );

    const subjects = await resolver.execute([makeNotification()], 'user-1');

    expect(subjects.of('notification-1')!.target).toEqual({
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

    const subjects = await resolver.execute([makeNotification()], 'user-1');

    expect(subjects.of('notification-1')!.actor!.name).toBe('Alicia');
    expect(subjects.of('notification-1')!.target!.name).toBe('Wolf Sheep Predation');
  });

  it('touches no repository for a page with no references', async () => {
    const subjects = await resolver.execute(
      [makeNotification({ actorId: null, targetType: null, targetId: null })],
      'user-1',
    );

    expect(userRepository.findAvatarsByIds).toHaveBeenCalledWith([]);
    expect(modelService.getModelPreviewsForViewer).toHaveBeenCalledWith([], 'user-1');
    expect(subjects.of('notification-1')).toEqual({ actor: null, target: null });
  });

  it('resolves nothing for an empty page', async () => {
    const subjects = await resolver.execute([], 'user-1');

    expect(() => subjects.of('notification-1')).toThrow('notification-1');
    expect(userRepository.findAvatarsByIds).not.toHaveBeenCalled();
  });

  it('throws when asked for the subjects of a notification it was not given', async () => {
    const subjects = await resolver.execute([makeNotification()], 'user-1');

    expect(() => subjects.of('other')).toThrow('other');
  });
});
