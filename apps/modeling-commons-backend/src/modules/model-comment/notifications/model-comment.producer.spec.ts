import { makeSubjectsByNotificationId } from '#src/modules/user-notification/core/subjects.domain.ts';
import { modelCommentCategories } from '#src/modules/model-comment/notifications/model-comment.categories.ts';
import userDomain from '#src/modules/user/domain/user.domain.ts';
import { describe, it, expect, beforeEach } from 'vitest';
import env from '#src/config/env.ts';
import makeModelCommentProducer from '#src/modules/model-comment/notifications/model-comment.producer.ts';
import { modelCommentNotifications } from '#src/modules/model-comment/notifications/model-comment.notifications.ts';
import mailDomain from '#src/modules/mail/domain/mail.domain.ts';
import type { ModelCommentEntity } from '#src/modules/model-comment/domain/model-comment.types.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import { buildDigest } from '#src/modules/user-notification/digest/digest.domain.ts';
import { truncatePreview } from '#src/shared/utils/formatters.ts';
import type {
  Email,
  Notification,
  NotificationSubjects,
  SubjectsByNotificationId,
} from '#src/modules/user-notification/core/types/index.ts';
import { mockPort } from '#src/shared/test/mock-port.ts';
import type { ModelCommentRepository } from '#src/modules/model-comment/database/model-comment.repository.port.ts';
import type { ModelAuthorRepository } from '#src/modules/model-author/database/model-author.repository.port.ts';

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
    ...overrides,
  } as EventRecord;
}

const recipient: Email.Recipient = { id: 'author-1', email: 'author@x.com', name: 'Author' };
const emailLinks: Email.Links = {
  unsubscribeUrl: 'https://example.test/unsubscribe?token=t',
  oneClickUnsubscribeUrl: 'https://api.example.test/api/v1/notification-unsubscribe?token=t',
  preferencesUrl: 'https://example.test/settings/notifications',
};

describe('modelCommentProducer', () => {
  const modelCommentRepository = mockPort<ModelCommentRepository>();
  const modelAuthorRepository = mockPort<ModelAuthorRepository>();

  const producer = makeModelCommentProducer({
    modelCommentRepository,
    modelAuthorRepository,
    userDomain: userDomain(),
    mailDomain: mailDomain(),
  } as never);

  beforeEach(() => {
    modelCommentRepository.findById.mockReset().mockResolvedValue(makeComment());
    modelAuthorRepository.findAllByModel.mockReset();
  });

  it('resolves no notification newNotification for a deleted event', async () => {
    const newNotifications = await producer.buildNotifications(
      makeEvent({
        type: 'model_comment.deleted',
        payload: { commentId: 'comment-1', byAdmin: false },
      }),
    );

    expect(newNotifications).toEqual([]);
    expect(modelCommentRepository.findById).not.toHaveBeenCalled();
  });

  describe('findRedaction', () => {
    it('drops the excerpt from every notification about the deleted comment', () => {
      const event = makeEvent({
        type: 'model_comment.deleted',
        payload: { commentId: 'comment-1', byAdmin: false },
      });

      expect(producer.findRedaction(event)).toEqual({
        match: { payloadKey: 'commentId', value: 'comment-1' },
        payloadFields: ['excerpt'],
      });
    });

    it('redacts nothing for a created event', () => {
      expect(producer.findRedaction(makeEvent())).toBeUndefined();
    });
  });

  it('notifies no one when the event refers to a comment that no longer resolves', async () => {
    modelCommentRepository.findById.mockResolvedValue(undefined);
    modelAuthorRepository.findAllByModel.mockResolvedValue([
      { modelId: 'model-1', userId: 'author-1', role: 'owner' },
    ]);

    const newNotifications = await producer.buildNotifications(
      makeEvent({ payload: { commentId: 'missing', parentId: null } }),
    );

    expect(newNotifications).toEqual([]);
  });

  it('notifies no one when the comment was deleted before the event was handled', async () => {
    modelCommentRepository.findById.mockResolvedValue(
      makeComment({ deletedAt: new Date('2026-01-02'), content: null }),
    );
    modelAuthorRepository.findAllByModel.mockResolvedValue([
      { modelId: 'model-1', userId: 'author-1', role: 'owner' },
    ]);

    const newNotifications = await producer.buildNotifications(makeEvent());

    expect(newNotifications).toEqual([]);
  });

  it('resolves notification newNotification for every model author except the commenter', async () => {
    modelAuthorRepository.findAllByModel.mockResolvedValue([
      { modelId: 'model-1', userId: 'author-1', role: 'owner' },
      { modelId: 'model-1', userId: 'commenter-1', role: 'contributor' },
    ]);

    const newNotifications = await producer.buildNotifications(makeEvent());

    expect(newNotifications).toHaveLength(1);
    expect(newNotifications[0]!.recipientId).toBe('author-1');
    expect(newNotifications[0]!.category).toBe(modelCommentCategories.onYourModel);
  });

  it('references the commenter and the model in all notification newNotification', async () => {
    const parent = makeComment({ id: 'parent-1', modelId: 'model-1', userId: 'author-1' });
    const reply = makeComment({ id: 'reply-1', userId: 'commenter-1', parentId: 'parent-1' });
    modelCommentRepository.findById.mockImplementation(async (id: string) =>
      id === 'reply-1' ? reply : id === 'parent-1' ? parent : undefined,
    );
    modelAuthorRepository.findAllByModel.mockResolvedValue([
      { modelId: 'model-1', userId: 'owner-1', role: 'owner' },
    ]);

    const newNotifications = await producer.buildNotifications(
      makeEvent({ payload: { commentId: 'reply-1', parentId: 'parent-1' } }),
    );

    expect(newNotifications).toHaveLength(2);
    for (const newNotification of newNotifications) {
      expect(newNotification.actorId).toBe('commenter-1');
      expect(newNotification.target).toEqual({ type: 'model', id: 'model-1' });
    }
  });

  it('stores the comment id and its excerpt as the payload and no rendered text', async () => {
    modelCommentRepository.findById.mockResolvedValue(makeComment({ content: 'x'.repeat(400) }));
    modelAuthorRepository.findAllByModel.mockResolvedValue([
      { modelId: 'model-1', userId: 'author-1', role: 'owner' },
    ]);

    const [newNotification] = await producer.buildNotifications(makeEvent());

    expect(newNotification!.payload).toEqual({
      commentId: 'comment-1',
      excerpt: truncatePreview('x'.repeat(400)),
    });
    expect(newNotification).not.toHaveProperty('title');
    expect(newNotification).not.toHaveProperty('body');
  });

  it('leaves the actor unset for a comment with no author', async () => {
    modelCommentRepository.findById.mockResolvedValue(makeComment({ userId: null }));
    modelAuthorRepository.findAllByModel.mockResolvedValue([
      { modelId: 'model-1', userId: 'author-1', role: 'owner' },
    ]);

    const newNotifications = await producer.buildNotifications(makeEvent());

    expect(newNotifications[0]!.actorId).toBeUndefined();
    expect(newNotifications[0]!.target).toEqual({ type: 'model', id: 'model-1' });
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

    const newNotifications = await producer.buildNotifications(
      makeEvent({ payload: { commentId: 'reply-1', parentId: 'parent-1' } }),
    );

    const replyNewNotification = newNotifications.find(
      (newNotification) => newNotification.category === modelCommentCategories.replyToYou,
    )!;
    const modelNewNotification = newNotifications.find(
      (newNotification) => newNotification.category === modelCommentCategories.onYourModel,
    )!;
    expect(replyNewNotification.recipientId).toBe('author-1');
    expect(modelNewNotification.recipientId).toBe('owner-1');

    const replyUrl = new URL(replyNewNotification.url);
    expect(replyUrl.pathname).toBe('/models/model-1/comments/parent-1');
    expect(replyUrl.searchParams.get('highlightedCommentId')).toBe('reply-1');
    expect(modelNewNotification.url).toBe(replyUrl.toString());
  });

  it('opens a top-level comment notification on the comment itself', async () => {
    modelCommentRepository.findById.mockResolvedValue(makeComment({ id: 'comment-1' }));
    modelAuthorRepository.findAllByModel.mockResolvedValue([
      { modelId: 'model-1', userId: 'author-1', role: 'owner' },
    ]);

    const newNotifications = await producer.buildNotifications(makeEvent());

    const url = new URL(newNotifications[0]!.url);
    expect(url.origin).toBe(new URL(env.product.website).origin);
    expect(url.pathname).toBe('/models/model-1/comments/comment-1');
    expect(url.searchParams.get('highlightedCommentId')).toBe('comment-1');
  });

  describe('renderEmail', () => {
    function makeEmailNotification(overrides: Partial<Notification> = {}): Notification {
      return {
        id: 'notification-1',
        category: modelCommentCategories.onYourModel,
        url: 'https://example.test/models/wolf/comments/comment-1',
        payload: { commentId: 'comment-1', excerpt: 'Nice model' },
        actorId: 'alice',
        targetType: 'model',
        targetId: 'wolf',
        createdAt: new Date('2026-01-01T08:00:00Z'),
        ...overrides,
      };
    }

    function makeEmailSubjects(
      actorName: string | null,
      model: { name: string | null; thumbnailUrl: string | null },
    ): NotificationSubjects {
      return {
        actor: { name: actorName, thumbnailUrl: null, url: 'https://example.test/users/alice' },
        target: { ...model, url: 'https://example.test/models/wolf' },
      };
    }

    const readable = { name: 'Wolf Sheep', thumbnailUrl: 'https://cdn.example.test/wolf.png' };

    it('shows the actor and model names current when the email is rendered', async () => {
      const notification = makeEmailNotification();

      const before = await producer.renderEmail(
        notification,
        recipient,
        makeEmailSubjects('Alice', readable),
        emailLinks,
      );
      const after = await producer.renderEmail(
        notification,
        recipient,
        makeEmailSubjects('Alicia', { ...readable, name: 'Wolf Sheep Predation' }),
        emailLinks,
      );

      expect(before.subject).toBe('Alice commented on your model "Wolf Sheep"');
      expect(after.subject).toBe('Alicia commented on your model "Wolf Sheep Predation"');
      expect(after.text).toContain('Alicia');
      expect(after.html).toContain('Wolf Sheep Predation');
      expect(after.html).not.toContain('Alice ');
    });

    it('renders a reply with the reply template', async () => {
      const email = await producer.renderEmail(
        makeEmailNotification({ category: modelCommentCategories.replyToYou }),
        recipient,
        makeEmailSubjects('Alice', readable),
        emailLinks,
      );

      expect(email.subject).toBe('Alice replied to your comment');
    });

    it.each([modelCommentCategories.onYourModel, modelCommentCategories.replyToYou])(
      'says "a model", keeps the link and shows no image for an unreadable model in %s',
      async (category) => {
        const email = await producer.renderEmail(
          makeEmailNotification({ category }),
          recipient,
          makeEmailSubjects('Alice', { name: null, thumbnailUrl: null }),
          emailLinks,
        );

        expect(email.html).toContain('a model');
        expect(email.html).toContain('href="https://example.test/models/wolf"');
        expect(email.html).not.toContain('<img');
        for (const part of [email.subject, email.html, email.text]) {
          expect(part).not.toContain('Wolf Sheep');
        }
      },
    );

    it('shows the thumbnail of a readable model', async () => {
      const email = await producer.renderEmail(
        makeEmailNotification(),
        recipient,
        makeEmailSubjects('Alice', readable),
        emailLinks,
      );

      expect(email.html).toContain('src="https://cdn.example.test/wolf.png"');
    });

    it('names an actor who no longer resolves "Someone"', async () => {
      const email = await producer.renderEmail(
        makeEmailNotification(),
        recipient,
        { actor: null, target: { ...readable, url: 'https://example.test/models/wolf' } },
        emailLinks,
      );

      expect(email.subject).toBe('Someone commented on your model "Wolf Sheep"');
    });

    it('sends the stored excerpt and comment link to the recipient', async () => {
      const notification = makeEmailNotification();

      const email = await producer.renderEmail(
        notification,
        recipient,
        makeEmailSubjects('Alice', readable),
        emailLinks,
      );

      expect(email.to).toBe(recipient.email);
      expect(email.text).toContain('Nice model');
      expect(email.html).toContain(`href="${notification.url}"`);
    });
  });

  describe('describeFeedItem', () => {
    function makeFeedNotification(overrides: Partial<Notification> = {}): Notification {
      return {
        id: 'notification-1',
        category: modelCommentCategories.onYourModel,
        url: 'https://example.test/comments/notification-1',
        payload: { commentId: 'comment-1', excerpt: 'Nice model' },
        actorId: 'alice',
        targetType: 'model',
        targetId: 'wolf',
        createdAt: new Date('2026-01-01T08:00:00Z'),
        ...overrides,
      };
    }

    function makeFeedSubjects(
      actorName: string | null | undefined,
      modelName: string | null = 'Wolf Sheep',
    ): NotificationSubjects {
      return {
        actor:
          actorName === undefined
            ? null
            : { name: actorName, thumbnailUrl: null, url: 'https://example.test/users/alice' },
        target:
          modelName === null
            ? null
            : { name: modelName, thumbnailUrl: null, url: 'https://example.test/models/wolf' },
      };
    }

    it('titles a comment and a reply with the subject actor name and the verb of each category', () => {
      expect(producer.describeFeedItem(makeFeedNotification(), makeFeedSubjects('Alicia'))).toEqual(
        {
          title: 'Alicia commented on your model',
          body: 'Nice model',
        },
      );
      expect(
        producer.describeFeedItem(
          makeFeedNotification({ category: modelCommentCategories.replyToYou }),
          makeFeedSubjects('Alicia'),
        ),
      ).toEqual({ title: 'Alicia replied to your comment', body: 'Nice model' });
    });

    it('names a deleted or nameless actor "Someone"', () => {
      expect(
        producer.describeFeedItem(makeFeedNotification(), makeFeedSubjects(undefined)).title,
      ).toBe('Someone commented on your model');
      expect(producer.describeFeedItem(makeFeedNotification(), makeFeedSubjects(null)).title).toBe(
        'Someone commented on your model',
      );
    });

    it('quotes no excerpt when the recipient can no longer read the model', () => {
      expect(
        producer.describeFeedItem(makeFeedNotification(), makeFeedSubjects('Alicia', null)),
      ).toEqual({
        title: 'Alicia commented on your model',
        body: '',
      });
    });

    it('never mentions the model, readable or not', () => {
      for (const modelName of ['Wolf Sheep', null]) {
        const description = producer.describeFeedItem(
          makeFeedNotification(),
          makeFeedSubjects('Alice', modelName),
        );
        expect(JSON.stringify(description)).not.toContain('Wolf Sheep');
      }
    });

    it('renders an empty body for a redacted excerpt', () => {
      const payload = { commentId: 'comment-1', excerpt: '' };

      expect(
        producer.describeFeedItem(makeFeedNotification({ payload }), makeFeedSubjects('Alice')),
      ).toEqual({
        title: 'Alice commented on your model',
        body: '',
      });
    });
  });

  describe('describeDigestItem', () => {
    const registered = { ...modelCommentNotifications, producer };
    const moduleByCategory = {
      [modelCommentCategories.onYourModel]: registered,
      [modelCommentCategories.replyToYou]: registered,
    };

    function makeNotification(
      id: string,
      actorId: string | null,
      minute: number,
      overrides: Partial<Notification> = {},
    ): Notification {
      return {
        id,
        category: modelCommentCategories.onYourModel,
        url: `https://example.test/comments/${id}`,
        payload: { commentId: id, excerpt: 'Nice model' },
        actorId,
        targetType: 'model',
        targetId: 'wolf',
        createdAt: new Date(`2026-01-01T08:${String(minute).padStart(2, '0')}:00Z`),
        ...overrides,
      };
    }

    function makeDigestSubjects(
      notifications: ReadonlyArray<Notification>,
      actorNames: Record<string, string | null>,
      modelName: string | null,
    ): SubjectsByNotificationId {
      return makeSubjectsByNotificationId(
        notifications.map((notification) => {
          const actorName = notification.actorId ? actorNames[notification.actorId] : undefined;
          return [
            notification.id,
            {
              actor:
                actorName === undefined
                  ? null
                  : { name: actorName, thumbnailUrl: null, url: `https://example.test/users/x` },
              target: {
                name: modelName,
                thumbnailUrl: null,
                url: 'https://example.test/models/wolf',
              },
            },
          ];
        }),
      );
    }

    function describeLines(
      notifications: ReadonlyArray<Notification>,
      actorNames: Record<string, string | null>,
      modelName: string | null = 'Wolf Sheep',
    ) {
      return buildDigest(
        notifications,
        makeDigestSubjects(notifications, actorNames, modelName),
        moduleByCategory,
      ).items;
    }

    it('names at most two of three people commenting and replying on one model, newest first', () => {
      const notifications = [
        makeNotification('c1', 'alice', 1),
        makeNotification('c2', 'bob', 2),
        makeNotification('r1', 'carol', 3, { category: modelCommentCategories.replyToYou }),
      ];

      expect(describeLines(notifications, { alice: 'Alice', bob: 'Bob', carol: 'Carol' })).toEqual([
        {
          text: 'Carol, Bob, and 1 other commented on Wolf Sheep',
          url: 'https://example.test/models/wolf',
        },
      ]);
    });

    it('counts one person commenting several times once', () => {
      const notifications = [
        makeNotification('a1', 'alice', 1),
        makeNotification('a2', 'alice', 2),
        makeNotification('a3', 'alice', 3),
      ];

      expect(describeLines(notifications, { alice: 'Alice' }).map((item) => item.text)).toEqual([
        'Alice commented on Wolf Sheep',
      ]);
    });

    it('counts an actor who no longer resolves without naming them', () => {
      const notifications = [
        makeNotification('gone', 'deleted-user', 2),
        makeNotification('a', 'alice', 1),
      ];

      expect(describeLines(notifications, { alice: 'Alice' }).map((item) => item.text)).toEqual([
        'Alice and 1 other commented on Wolf Sheep',
      ]);
    });

    it('counts an actor without a name without naming them', () => {
      expect(
        describeLines([makeNotification('n', 'nameless', 1)], { nameless: null }).map(
          (item) => item.text,
        ),
      ).toEqual(['One person commented on Wolf Sheep']);
    });

    it('speaks of one person when no notification has a known actor', () => {
      expect(describeLines([makeNotification('n', null, 1)], {}).map((item) => item.text)).toEqual([
        'One person commented on Wolf Sheep',
      ]);
    });

    it('has no line for a model that no longer resolves', () => {
      const notifications = [makeNotification('a', 'alice', 1)];

      const unresolved = makeSubjectsByNotificationId([['a', { actor: null, target: null }]]);

      expect(buildDigest(notifications, unresolved, moduleByCategory).items).toEqual([]);
    });

    it('shows the names current when the digest is built, after the user and the model are renamed', () => {
      const notifications = [makeNotification('a', 'alice', 1)];

      const before = describeLines(notifications, { alice: 'Alice' }, 'Wolf Sheep');
      const after = describeLines(notifications, { alice: 'Alicia' }, 'Wolf Sheep Predation');

      expect(before.map((item) => item.text)).toEqual(['Alice commented on Wolf Sheep']);
      expect(after.map((item) => item.text)).toEqual(['Alicia commented on Wolf Sheep Predation']);
    });

    it('has no line, and no trace of the model title, for a model the recipient cannot read', () => {
      const notifications = [makeNotification('a', 'alice', 1), makeNotification('b', 'bob', 2)];

      const digest = buildDigest(
        notifications,
        makeDigestSubjects(notifications, { alice: 'Alice', bob: 'Bob' }, null),
        moduleByCategory,
      );

      expect(digest).toEqual({ items: [], moreCount: 0 });
      expect(JSON.stringify(digest)).not.toContain('Wolf Sheep');
    });
  });
});
