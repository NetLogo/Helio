import type { NotificationPreferenceSeed } from './types.js';

// Notification rows are derived from COMMENTS by the same rules the comment notifier
// applies, so these overrides are the only notification input. uri and maria take
// daily email, so the comments seeded within the last day stay pending for a digest.
export const NOTIFICATION_PREFERENCES: NotificationPreferenceSeed[] = [
  { user: 'uri', category: 'comment.on_your_model', email: 'daily' },
  { user: 'maria', category: 'comment.reply_to_you', email: 'daily' },
  { user: 'seth', category: 'comment.on_your_model', email: 'immediate' },
  { user: 'seth', category: 'comment.reply_to_you', email: 'off' },
  { user: 'amara', category: 'comment.on_your_model', email: 'off', inApp: true },
];
