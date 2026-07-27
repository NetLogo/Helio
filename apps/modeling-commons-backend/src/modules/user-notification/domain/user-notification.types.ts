export type NotificationCategory =
  | 'comment.on_your_model'
  | 'comment.reply_to_you'
  | 'general.daily_digest';

export type NotificationChannels = {
  email: boolean;
  inApp: boolean;
};

export type NotificationCategoryInfo = {
  category: NotificationCategory;
  label: string;
  description: string;
  defaults: NotificationChannels;
};
