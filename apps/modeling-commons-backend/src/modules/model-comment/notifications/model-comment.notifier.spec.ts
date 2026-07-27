import { describe, it, expect, vi, beforeEach } from 'vitest';
import env from '#src/config/env.ts';
import makeModelCommentNotifier from '#src/modules/model-comment/notifications/model-comment.notifier.ts';
import { CommentNotFoundError } from '#src/modules/model-comment/domain/model-comment.errors.ts';
import { mockModelCommentRepository } from '#src/modules/model-comment/database/model-comment.repository.mock.ts';
import { mockModelAuthorRepository } from '#src/modules/model-author/database/model-author.repository.mock.ts';
import { mockUserRepository } from '#src/modules/user/database/user.repository.mock.ts';
import type { ModelCommentEntity } from '#src/modules/model-comment/domain/model-comment.types.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import type {
  NotificationLinks,
  NotificationRecipient,
} from '#src/modules/user-notification/domain/user-notification.types.ts';

function makeComment(overrides: Partial<ModelCommentEntity> = {}): ModelCommentEntity {
  return {
    id: 'comment-1',
    legacyId: null,
    parentId: null,
    userId: 'commenter-1',
    modelId: 'model-1',
    versionNumber: null,
    content: 'hello',
    likesCount: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    editedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 'event-1',
    type: 'model_comment.created',
    actorId: 'commenter-1',
    resourceType: 'model',
    resourceId: 'model-1',
    payload: { commentId: 'comment-1', parentId: null },
    createdAt: new Date('2026-01-01'),
    processedAt: null,
    attempts: 0,
    lastError: null,
    ...overrides,
  };
}

const recipient: NotificationRecipient = { id: 'author-1', email: 'author@x.com', name: 'Author' };
const links: NotificationLinks = {
  unsubscribeUrl: 'mailto:support@example.test',
  preferencesUrl: 'https://example.test/settings/notifications',
};

describe('modelCommentNotifier', () => {
  const modelCommentRepository = mockModelCommentRepository();
  const modelAuthorRepository = mockModelAuthorRepository();
  const userRepository = mockUserRepository();
  const mailDomain = {
    createCommentedOnModelEmail: vi.fn(),
    createRepliedToCommentEmail: vi.fn(),
  };
  const getModelCardQuery = { execute: vi.fn() };
  const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn() };

  const notifier = makeModelCommentNotifier({
    modelCommentRepository,
    modelAuthorRepository,
    userRepository,
    getModelCardQuery,
    mailDomain,
    logger,
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
    const rendered = { from: 'a@b.com', to: 'x@y.com', subject: 'subj', html: '<p/>', text: 'p' };
    mailDomain.createCommentedOnModelEmail.mockResolvedValue(rendered);
    mailDomain.createRepliedToCommentEmail.mockResolvedValue(rendered);
    getModelCardQuery.execute.mockResolvedValue({
      latestVersion: { title: 'My Model' },
      previewImageUrl: null,
      authors: [],
    });
    userRepository.findOneById.mockResolvedValue({ id: 'commenter-1', name: 'Commenter' });
    modelCommentRepository.findById.mockResolvedValue(makeComment());
  });

  it('declares model_comment.created as its only event type', () => {
    expect(notifier.eventTypes).toEqual(['model_comment.created']);
  });

  it('throws when the event refers to a comment that no longer resolves', async () => {
    modelCommentRepository.findById.mockResolvedValue(undefined);

    await expect(
      notifier.resolve(makeEvent({ payload: { commentId: 'missing', parentId: null } })),
    ).rejects.toThrow(CommentNotFoundError);
  });

  it('resolves an intent for every model author except the commenter', async () => {
    modelAuthorRepository.findAllByModel.mockResolvedValue([
      { modelId: 'model-1', userId: 'author-1', role: 'owner' },
      { modelId: 'model-1', userId: 'commenter-1', role: 'contributor' },
    ]);

    const intents = await notifier.resolve(makeEvent());

    expect(intents).toHaveLength(1);
    expect(intents[0]!.recipientUserId).toBe('author-1');
    expect(intents[0]!.category).toBe('comment.on_your_model');

    await intents[0]!.buildEmail(recipient, links);
    expect(mailDomain.createCommentedOnModelEmail).toHaveBeenCalledOnce();
    expect(mailDomain.createRepliedToCommentEmail).not.toHaveBeenCalled();
  });

  it('calls getModelCardQuery.execute once per event, not once per recipient', async () => {
    modelAuthorRepository.findAllByModel.mockResolvedValue([
      { modelId: 'model-1', userId: 'author-1', role: 'owner' },
      { modelId: 'model-1', userId: 'author-2', role: 'contributor' },
    ]);

    await notifier.resolve(makeEvent());

    expect(getModelCardQuery.execute).toHaveBeenCalledOnce();
  });

  it('opens a reply notification on the parent thread with the reply highlighted', async () => {
    const parent = makeComment({ id: 'parent-1', modelId: 'model-1', userId: 'author-1' });
    const reply = makeComment({
      id: 'reply-1',
      modelId: 'model-1',
      userId: 'commenter-1',
      parentId: 'parent-1',
    });
    modelCommentRepository.findById.mockImplementation(async (id: string) => {
      if (id === 'reply-1') return reply;
      if (id === 'parent-1') return parent;
      return undefined;
    });
    modelAuthorRepository.findAllByModel.mockResolvedValue([
      { modelId: 'model-1', userId: 'owner-1', role: 'owner' },
    ]);

    const intents = await notifier.resolve(
      makeEvent({ payload: { commentId: 'reply-1', parentId: 'parent-1' } }),
    );

    const replyIntent = intents.find((intent) => intent.category === 'comment.reply_to_you')!;
    const modelIntent = intents.find((intent) => intent.category === 'comment.on_your_model')!;
    expect(replyIntent.recipientUserId).toBe('author-1');
    expect(modelIntent.recipientUserId).toBe('owner-1');

    await replyIntent.buildEmail({ id: 'author-1', email: 'author-1@x.com', name: 'Author' }, links);
    await modelIntent.buildEmail({ id: 'owner-1', email: 'owner-1@x.com', name: 'Owner' }, links);

    const replyUrl = new URL(mailDomain.createRepliedToCommentEmail.mock.calls[0]![5]);
    expect(replyUrl.pathname).toBe('/models/model-1/comments/parent-1');
    expect(replyUrl.searchParams.get('highlightedCommentId')).toBe('reply-1');
    expect(mailDomain.createCommentedOnModelEmail.mock.calls[0]![5]).toBe(replyUrl.toString());
  });

  it('opens a top-level comment notification on the comment itself', async () => {
    modelCommentRepository.findById.mockResolvedValue(makeComment({ id: 'comment-1' }));
    modelAuthorRepository.findAllByModel.mockResolvedValue([
      { modelId: 'model-1', userId: 'author-1', role: 'owner' },
    ]);

    const intents = await notifier.resolve(makeEvent());
    await intents[0]!.buildEmail(recipient, links);

    const url = new URL(mailDomain.createCommentedOnModelEmail.mock.calls[0]![5]);
    expect(url.origin).toBe(new URL(env.product.website).origin);
    expect(url.pathname).toBe('/models/model-1/comments/comment-1');
    expect(url.searchParams.get('highlightedCommentId')).toBe('comment-1');
  });

  it('falls back to a generic model name when the model card query fails', async () => {
    modelAuthorRepository.findAllByModel.mockResolvedValue([
      { modelId: 'model-1', userId: 'author-1', role: 'owner' },
    ]);
    getModelCardQuery.execute.mockRejectedValue(new Error('card query down'));

    const intents = await notifier.resolve(makeEvent());
    await intents[0]!.buildEmail(recipient, links);

    expect(mailDomain.createCommentedOnModelEmail).toHaveBeenCalledWith(
      recipient.email,
      recipient.name,
      'Commenter',
      expect.objectContaining({ name: 'a model' }),
      expect.any(String),
      expect.any(String),
      links.unsubscribeUrl,
    );
    expect(logger.error).toHaveBeenCalled();
  });
});
