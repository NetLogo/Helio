import { modelCommentCategories } from '#src/modules/model-comment/notifications/model-comment.categories.ts';
import { describe, it, expect } from 'vitest';
import { selectCommentRecipients } from '#src/modules/model-comment/notifications/model-comment.recipients.ts';

describe('selectCommentRecipients', () => {
  it('notifies every model author of a top-level comment except the commenter', () => {
    const recipients = selectCommentRecipients({
      commenterId: 'author-a',
      parentAuthorId: null,
      modelAuthorIds: ['author-a', 'author-b'],
    });

    expect(recipients).toEqual([
      {
        recipientId: 'author-b',
        category: modelCommentCategories.onYourModel,
      },
    ]);
  });

  it('sends the parent author a reply notice instead of the model notice', () => {
    const recipients = selectCommentRecipients({
      commenterId: 'commenter',
      parentAuthorId: 'author-a',
      modelAuthorIds: ['author-a', 'author-b'],
    });

    expect(recipients).toEqual([
      {
        recipientId: 'author-a',
        category: modelCommentCategories.replyToYou,
      },
      {
        recipientId: 'author-b',
        category: modelCommentCategories.onYourModel,
      },
    ]);
  });

  it('does not notify a commenter replying to their own comment', () => {
    const recipients = selectCommentRecipients({
      commenterId: 'author-a',
      parentAuthorId: 'author-a',
      modelAuthorIds: ['author-a'],
    });

    expect(recipients).toEqual([]);
  });

  it('notifies each model author once when the author list repeats', () => {
    const recipients = selectCommentRecipients({
      commenterId: 'commenter',
      parentAuthorId: null,
      modelAuthorIds: ['author-a', 'author-a'],
    });

    expect(recipients.map((recipient) => recipient.recipientId)).toEqual(['author-a']);
  });
});
