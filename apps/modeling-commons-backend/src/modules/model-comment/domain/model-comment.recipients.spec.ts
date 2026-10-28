import { describe, it, expect } from 'vitest';
import {
  formatCommenterName,
  listCommentNotificationRecipients,
} from '#src/modules/model-comment/domain/model-comment.recipients.ts';

describe('listCommentNotificationRecipients', () => {
  it('notifies every model author of a top-level comment except the commenter', () => {
    const recipients = listCommentNotificationRecipients({
      commenterId: 'author-a',
      commenterName: 'Ada',
      parentAuthorId: null,
      modelAuthorIds: ['author-a', 'author-b'],
    });

    expect(recipients).toEqual([
      {
        recipientId: 'author-b',
        category: 'comment.on_your_model',
        title: 'Ada commented on your model',
      },
    ]);
  });

  it('sends the parent author a reply notice instead of the model notice', () => {
    const recipients = listCommentNotificationRecipients({
      commenterId: 'commenter',
      commenterName: 'Ada',
      parentAuthorId: 'author-a',
      modelAuthorIds: ['author-a', 'author-b'],
    });

    expect(recipients).toEqual([
      {
        recipientId: 'author-a',
        category: 'comment.reply_to_you',
        title: 'Ada replied to your comment',
      },
      {
        recipientId: 'author-b',
        category: 'comment.on_your_model',
        title: 'Ada commented on your model',
      },
    ]);
  });

  it('does not notify a commenter replying to their own comment', () => {
    const recipients = listCommentNotificationRecipients({
      commenterId: 'author-a',
      commenterName: 'Ada',
      parentAuthorId: 'author-a',
      modelAuthorIds: ['author-a'],
    });

    expect(recipients).toEqual([]);
  });

  it('notifies each model author once when the author list repeats', () => {
    const recipients = listCommentNotificationRecipients({
      commenterId: 'commenter',
      commenterName: 'Ada',
      parentAuthorId: null,
      modelAuthorIds: ['author-a', 'author-a'],
    });

    expect(recipients.map((recipient) => recipient.recipientId)).toEqual(['author-a']);
  });
});

describe('formatCommenterName', () => {
  it('uses the commenter name when present', () => {
    expect(formatCommenterName('Ada')).toBe('Ada');
  });

  it('falls back to a neutral actor when the commenter has no name', () => {
    expect(formatCommenterName(null)).toBe('Someone');
  });
});
