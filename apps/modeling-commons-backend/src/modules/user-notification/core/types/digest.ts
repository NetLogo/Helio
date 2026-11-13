import type { Notification } from './notification.ts';

export type Item = { text: string; url: string };

export type Summary = { items: Array<Item>; moreCount: number };

export type Window = { since: Date; until: Date };

export type GroupActor = { userId: string; notificationId: string };

export type Group = {
  target: { type: string; id: string } | null;
  actors: Array<GroupActor>;
  notifications: Array<Notification>;
};
