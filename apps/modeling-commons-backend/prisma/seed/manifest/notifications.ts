import type { NotificationPreferenceSeed } from './types.js';

export const NOTIFICATION_PREFERENCES: NotificationPreferenceSeed[] = [
  { user: 'uri', category: 'comment.on_your_model', email: 'daily' },
  { user: 'maria', category: 'comment.reply_to_you', email: 'daily' },
  { user: 'seth', category: 'comment.on_your_model', email: 'immediate' },
  { user: 'seth', category: 'comment.reply_to_you', email: 'off' },
  { user: 'amara', category: 'comment.on_your_model', email: 'off', inApp: true },
];
