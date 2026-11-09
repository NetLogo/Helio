import { describe, it, expect } from 'vitest';
import { listCommentNotificationRecipients } from '#src/modules/model-comment/notifications/model-comment.recipients.ts';

describe('listCommentNotificationRecipients', () => {
  it('notifies every model author of a top-level comment except the commenter', () => {
    const recipients = listCommentNotificationRecipients({
      commenterId: 'author-a',
      parentAuthorId: null,
      modelAuthorIds: ['author-a', 'author-b'],
    });

    expect(recipients).toEqual([
      {
        recipientId: 'author-b',
        category: 'comment.on_your_model',
      },
    ]);
  });

  it('sends the parent author a reply notice instead of the model notice', () => {
    const recipients = listCommentNotificationRecipients({
      commenterId: 'commenter',
      parentAuthorId: 'author-a',
      modelAuthorIds: ['author-a', 'author-b'],
    });

    expect(recipients).toEqual([
      {
        recipientId: 'author-a',
        category: 'comment.reply_to_you',
      },
      {
        recipientId: 'author-b',
        category: 'comment.on_your_model',
      },
    ]);
  });

  it('does not notify a commenter replying to their own comment', () => {
    const recipients = listCommentNotificationRecipients({
      commenterId: 'author-a',
      parentAuthorId: 'author-a',
      modelAuthorIds: ['author-a'],
    });

    expect(recipients).toEqual([]);
  });

  it('notifies each model author once when the author list repeats', () => {
    const recipients = listCommentNotificationRecipients({
      commenterId: 'commenter',
      parentAuthorId: null,
      modelAuthorIds: ['author-a', 'author-a'],
    });

    expect(recipients.map((recipient) => recipient.recipientId)).toEqual(['author-a']);
  });
});
