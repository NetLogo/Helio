import type { EmailMode } from '#prisma/index';
import type { NotificationCategory } from '#src/modules/notification-catalog.ts';

export type ChannelPreferences = {
  email: EmailMode;
  inApp: boolean;
};

export type Config = {
  label: string;
  description: string;
  defaults: ChannelPreferences;
};

export type EmailModeByCategory = Partial<Record<NotificationCategory, EmailMode>>;

export type PreferenceOverride = Partial<ChannelPreferences> & { category: string };
