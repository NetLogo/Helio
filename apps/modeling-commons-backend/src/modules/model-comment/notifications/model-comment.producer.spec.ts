import userDomain from '#src/modules/user/domain/user.domain.ts';
import { describe, it, expect, beforeEach } from 'vitest';
import env from '#src/config/env.ts';
import makeModelCommentProducer from '#src/modules/model-comment/notifications/model-comment.producer.ts';
import { CommentNotFoundError } from '#src/modules/model-comment/domain/model-comment.errors.ts';
import { mockModelCommentRepository } from '#src/modules/model-comment/database/model-comment.repository.mock.ts';
import { mockModelAuthorRepository } from '#src/modules/model-author/database/model-author.repository.mock.ts';
import mailDomain from '#src/modules/mail/domain/mail.domain.ts';
import type { ModelCommentEntity } from '#src/modules/model-comment/domain/model-comment.types.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import { buildDigest } from '#src/modules/user-notification/domain/user-notification.grouping.ts';
import { truncatePreview } from '#src/shared/utils/formatters.ts';
import type {
  NotificationRow,
  NotificationLinks,
  NotificationPreviews,
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
    ...overrides,
  };
}

const recipient: NotificationRecipient = { id: 'author-1', email: 'author@x.com', name: 'Author' };
const emailLinks: NotificationLinks = {
  unsubscribeUrl: 'https://example.test/unsubscribe?token=t',
  oneClickUnsubscribeUrl: 'https://api.example.test/api/v1/notification-unsubscribe?token=t',
  preferencesUrl: 'https://example.test/settings/notifications',
};

describe('modelCommentProducer', () => {
  const modelCommentRepository = mockModelCommentRepository();
  const modelAuthorRepository = mockModelAuthorRepository();

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

  it('declares model_comment.created as its only event type', () => {
    expect(producer.eventTypes).toEqual(['model_comment.created']);
  });

  it('throws when the event refers to a comment that no longer resolves', async () => {
    modelCommentRepository.findById.mockResolvedValue(undefined);

    await expect(
      producer.resolve(makeEvent({ payload: { commentId: 'missing', parentId: null } })),
    ).rejects.toThrow(CommentNotFoundError);
  });

  it('resolves row facts for every model author except the commenter', async () => {
    modelAuthorRepository.findAllByModel.mockResolvedValue([
      { modelId: 'model-1', userId: 'author-1', role: 'owner' },
      { modelId: 'model-1', userId: 'commenter-1', role: 'contributor' },
    ]);

    const rowFacts = await producer.resolve(makeEvent());

    expect(rowFacts).toHaveLength(1);
    expect(rowFacts[0]!.recipientUserId).toBe('author-1');
    expect(rowFacts[0]!.category).toBe('comment.on_your_model');
  });

  it('references the commenter and the model in all row facts', async () => {
    const parent = makeComment({ id: 'parent-1', modelId: 'model-1', userId: 'author-1' });
    const reply = makeComment({ id: 'reply-1', userId: 'commenter-1', parentId: 'parent-1' });
    modelCommentRepository.findById.mockImplementation(async (id: string) =>
      id === 'reply-1' ? reply : id === 'parent-1' ? parent : undefined,
    );
    modelAuthorRepository.findAllByModel.mockResolvedValue([
      { modelId: 'model-1', userId: 'owner-1', role: 'owner' },
    ]);

    const rowFacts = await producer.resolve(
      makeEvent({ payload: { commentId: 'reply-1', parentId: 'parent-1' } }),
    );

    expect(rowFacts).toHaveLength(2);
    for (const facts of rowFacts) {
      expect(facts.actorUserId).toBe('commenter-1');
      expect(facts.target).toEqual({ type: 'model', id: 'model-1' });
    }
  });

  it('stores the comment id and its excerpt as the payload and no rendered text', async () => {
    modelCommentRepository.findById.mockResolvedValue(makeComment({ content: 'x'.repeat(400) }));
    modelAuthorRepository.findAllByModel.mockResolvedValue([
      { modelId: 'model-1', userId: 'author-1', role: 'owner' },
    ]);

    const [facts] = await producer.resolve(makeEvent());

    expect(facts!.payload).toEqual({
      commentId: 'comment-1',
      excerpt: truncatePreview('x'.repeat(400)),
    });
    expect(facts).not.toHaveProperty('title');
    expect(facts).not.toHaveProperty('body');
  });

  it('leaves the actor unset for a comment with no author', async () => {
    modelCommentRepository.findById.mockResolvedValue(makeComment({ userId: null }));
    modelAuthorRepository.findAllByModel.mockResolvedValue([
      { modelId: 'model-1', userId: 'author-1', role: 'owner' },
    ]);

    const rowFacts = await producer.resolve(makeEvent());

    expect(rowFacts[0]!.actorUserId).toBeUndefined();
    expect(rowFacts[0]!.target).toEqual({ type: 'model', id: 'model-1' });
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

    const rowFacts = await producer.resolve(
      makeEvent({ payload: { commentId: 'reply-1', parentId: 'parent-1' } }),
    );

    const replyFacts = rowFacts.find((facts) => facts.category === 'comment.reply_to_you')!;
    const modelFacts = rowFacts.find((facts) => facts.category === 'comment.on_your_model')!;
    expect(replyFacts.recipientUserId).toBe('author-1');
    expect(modelFacts.recipientUserId).toBe('owner-1');

    const replyUrl = new URL(replyFacts.url);
    expect(replyUrl.pathname).toBe('/models/model-1/comments/parent-1');
    expect(replyUrl.searchParams.get('highlightedCommentId')).toBe('reply-1');
    expect(modelFacts.url).toBe(replyUrl.toString());
  });

  it('opens a top-level comment notification on the comment itself', async () => {
    modelCommentRepository.findById.mockResolvedValue(makeComment({ id: 'comment-1' }));
    modelAuthorRepository.findAllByModel.mockResolvedValue([
      { modelId: 'model-1', userId: 'author-1', role: 'owner' },
    ]);

    const rowFacts = await producer.resolve(makeEvent());

    const url = new URL(rowFacts[0]!.url);
    expect(url.origin).toBe(new URL(env.product.website).origin);
    expect(url.pathname).toBe('/models/model-1/comments/comment-1');
    expect(url.searchParams.get('highlightedCommentId')).toBe('comment-1');
  });

  describe('renderEmail', () => {
    function makeEmailRow(overrides: Partial<NotificationRow> = {}): NotificationRow {
      return {
        id: 'row-1',
        category: 'comment.on_your_model',
        url: 'https://example.test/models/wolf/comments/comment-1',
        payload: { commentId: 'comment-1', excerpt: 'Nice model' },
        actorUserId: 'alice',
        targetType: 'model',
        targetId: 'wolf',
        createdAt: new Date('2026-01-01T08:00:00Z'),
        ...overrides,
      };
    }

    function makeEmailPreview(
      actorName: string | null,
      model: { name: string | null; thumbnailUrl: string | null },
    ): NotificationPreviews {
      return {
        actor: { name: actorName, thumbnailUrl: null, url: 'https://example.test/users/alice' },
        target: { ...model, url: 'https://example.test/models/wolf' },
      };
    }

    const readable = { name: 'Wolf Sheep', thumbnailUrl: 'https://cdn.example.test/wolf.png' };

    it('shows the actor and model names current when the email is rendered', async () => {
      const row = makeEmailRow();

      const before = await producer.renderEmail(
        row,
        recipient,
        makeEmailPreview('Alice', readable),
        emailLinks,
      );
      const after = await producer.renderEmail(
        row,
        recipient,
        makeEmailPreview('Alicia', { ...readable, name: 'Wolf Sheep Predation' }),
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
        makeEmailRow({ category: 'comment.reply_to_you' }),
        recipient,
        makeEmailPreview('Alice', readable),
        emailLinks,
      );

      expect(email.subject).toBe('Alice replied to your comment');
    });

    it.each(['comment.on_your_model', 'comment.reply_to_you'])(
      'says "a model", keeps the link and shows no image for an unreadable model in %s',
      async (category) => {
        const email = await producer.renderEmail(
          makeEmailRow({ category }),
          recipient,
          makeEmailPreview('Alice', { name: null, thumbnailUrl: null }),
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
        makeEmailRow(),
        recipient,
        makeEmailPreview('Alice', readable),
        emailLinks,
      );

      expect(email.html).toContain('src="https://cdn.example.test/wolf.png"');
    });

    it('names an actor who no longer resolves "Someone"', async () => {
      const email = await producer.renderEmail(
        makeEmailRow(),
        recipient,
        { actor: null, target: { ...readable, url: 'https://example.test/models/wolf' } },
        emailLinks,
      );

      expect(email.subject).toBe('Someone commented on your model "Wolf Sheep"');
    });

    it('sends the stored excerpt and comment link to the recipient', async () => {
      const row = makeEmailRow();

      const email = await producer.renderEmail(
        row,
        recipient,
        makeEmailPreview('Alice', readable),
        emailLinks,
      );

      expect(email.to).toBe(recipient.email);
      expect(email.text).toContain('Nice model');
      expect(email.html).toContain(`href="${row.url}"`);
    });
  });

  describe('describeRow', () => {
    function makeFeedRow(overrides: Partial<NotificationRow> = {}): NotificationRow {
      return {
        id: 'row-1',
        category: 'comment.on_your_model',
        url: 'https://example.test/comments/row-1',
        payload: { commentId: 'comment-1', excerpt: 'Nice model' },
        actorUserId: 'alice',
        targetType: 'model',
        targetId: 'wolf',
        createdAt: new Date('2026-01-01T08:00:00Z'),
        ...overrides,
      };
    }

    function makePreview(
      actorName: string | null | undefined,
      modelName: string | null = 'Wolf Sheep',
    ): NotificationPreviews {
      return {
        actor:
          actorName === undefined
            ? null
            : { name: actorName, thumbnailUrl: null, url: 'https://example.test/users/alice' },
        target: { name: modelName, thumbnailUrl: null, url: 'https://example.test/models/wolf' },
      };
    }

    it('titles a comment and a reply with the preview actor name and the verb of each category', () => {
      expect(producer.describeRow(makeFeedRow(), makePreview('Alicia'))).toEqual({
        title: 'Alicia commented on your model',
        body: 'Nice model',
      });
      expect(
        producer.describeRow(
          makeFeedRow({ category: 'comment.reply_to_you' }),
          makePreview('Alicia'),
        ),
      ).toEqual({ title: 'Alicia replied to your comment', body: 'Nice model' });
    });

    it('names a deleted or nameless actor "Someone"', () => {
      expect(producer.describeRow(makeFeedRow(), makePreview(undefined)).title).toBe(
        'Someone commented on your model',
      );
      expect(producer.describeRow(makeFeedRow(), makePreview(null)).title).toBe(
        'Someone commented on your model',
      );
    });

    it('never mentions the model, readable or not', () => {
      for (const modelName of ['Wolf Sheep', null]) {
        const description = producer.describeRow(makeFeedRow(), makePreview('Alice', modelName));
        expect(JSON.stringify(description)).not.toContain('Wolf Sheep');
      }
    });

    it.each([
      ['an empty object', {}],
      ['null', null],
      ['an array', ['Nice model']],
      ['a string', 'Nice model'],
      ['a non-string excerpt', { commentId: 'comment-1', excerpt: 42 }],
    ])('renders an empty body for a payload that is %s', (_label, payload) => {
      expect(producer.describeRow(makeFeedRow({ payload }), makePreview('Alice'))).toEqual({
        title: 'Alice commented on your model',
        body: '',
      });
    });
  });

  describe('describeGroup', () => {
    const producerByCategory = new Map([
      ['comment.on_your_model', producer],
      ['comment.reply_to_you', producer],
    ]);

    function makeRow(
      id: string,
      actorUserId: string | null,
      minute: number,
      overrides: Partial<NotificationRow> = {},
    ): NotificationRow {
      return {
        id,
        category: 'comment.on_your_model',
        url: `https://example.test/comments/${id}`,
        payload: { commentId: id, excerpt: 'Nice model' },
        actorUserId,
        targetType: 'model',
        targetId: 'wolf',
        createdAt: new Date(`2026-01-01T08:${String(minute).padStart(2, '0')}:00Z`),
        ...overrides,
      };
    }

    function makePreviews(
      rows: ReadonlyArray<NotificationRow>,
      actorNames: Record<string, string | null>,
      modelName: string | null,
    ): Map<string, NotificationPreviews> {
      return new Map(
        rows.map((row) => {
          const actorName = row.actorUserId ? actorNames[row.actorUserId] : undefined;
          return [
            row.id,
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
      rows: ReadonlyArray<NotificationRow>,
      actorNames: Record<string, string | null>,
      modelName: string | null = 'Wolf Sheep',
    ) {
      return buildDigest(rows, makePreviews(rows, actorNames, modelName), producerByCategory).items;
    }

    it('names at most two of three people commenting and replying on one model, newest first', () => {
      const rows = [
        makeRow('c1', 'alice', 1),
        makeRow('c2', 'bob', 2),
        makeRow('r1', 'carol', 3, { category: 'comment.reply_to_you' }),
      ];

      expect(describeLines(rows, { alice: 'Alice', bob: 'Bob', carol: 'Carol' })).toEqual([
        {
          text: 'Carol, Bob, and 1 other commented on Wolf Sheep',
          url: 'https://example.test/models/wolf',
        },
      ]);
    });

    it('counts one person commenting several times once', () => {
      const rows = [
        makeRow('a1', 'alice', 1),
        makeRow('a2', 'alice', 2),
        makeRow('a3', 'alice', 3),
      ];

      expect(describeLines(rows, { alice: 'Alice' }).map((item) => item.text)).toEqual([
        'Alice commented on Wolf Sheep',
      ]);
    });

    it('counts an actor who no longer resolves without naming them', () => {
      const rows = [makeRow('gone', 'deleted-user', 2), makeRow('a', 'alice', 1)];

      expect(describeLines(rows, { alice: 'Alice' }).map((item) => item.text)).toEqual([
        'Alice and 1 other commented on Wolf Sheep',
      ]);
    });

    it('counts an actor without a name without naming them', () => {
      expect(
        describeLines([makeRow('n', 'nameless', 1)], { nameless: null }).map((item) => item.text),
      ).toEqual(['One person commented on Wolf Sheep']);
    });

    it('speaks of one person when no row has a known actor', () => {
      expect(describeLines([makeRow('n', null, 1)], {}).map((item) => item.text)).toEqual([
        'One person commented on Wolf Sheep',
      ]);
    });

    it('has no line for a model that no longer resolves', () => {
      const rows = [makeRow('a', 'alice', 1)];

      expect(buildDigest(rows, new Map(), producerByCategory).items).toEqual([]);
    });

    it('shows the names current when the digest is built, after the user and the model are renamed', () => {
      const rows = [makeRow('a', 'alice', 1)];

      const before = describeLines(rows, { alice: 'Alice' }, 'Wolf Sheep');
      const after = describeLines(rows, { alice: 'Alicia' }, 'Wolf Sheep Predation');

      expect(before.map((item) => item.text)).toEqual(['Alice commented on Wolf Sheep']);
      expect(after.map((item) => item.text)).toEqual(['Alicia commented on Wolf Sheep Predation']);
    });

    it('has no line, and no trace of the model title, for a model the recipient cannot read', () => {
      const rows = [makeRow('a', 'alice', 1), makeRow('b', 'bob', 2)];

      const digest = buildDigest(
        rows,
        makePreviews(rows, { alice: 'Alice', bob: 'Bob' }, null),
        producerByCategory,
      );

      expect(digest).toEqual({ items: [], moreCount: 0 });
      expect(JSON.stringify(digest)).not.toContain('Wolf Sheep');
    });
  });
});
