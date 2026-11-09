import { vi } from 'vitest';
import { notificationCategoryCatalog } from '#src/modules/notification-producers.ts';
import type {
  NotificationGroup,
  NotificationPreviews,
  NotificationProducer,
} from '#src/modules/user-notification/domain/user-notification.types.ts';

export function mockNotificationProducer(
  overrides: Partial<NotificationProducer> = {},
): NotificationProducer {
  return {
    name: 'catalog',
    eventTypes: ['model_comment.created'],
    categories: notificationCategoryCatalog,
    resolve: vi.fn().mockResolvedValue([]),
    describeRow: vi.fn().mockReturnValue({ title: '', body: '' }),
    renderEmail: vi.fn().mockResolvedValue({}),
    describeGroup: vi.fn().mockReturnValue(undefined),
    ...overrides,
  };
}

export function describeGroupByTarget(
  group: NotificationGroup,
  previews: ReadonlyMap<string, NotificationPreviews>,
) {
  if (!group.target) {
    return { text: group.rows.map((row) => row.id).join(','), url: 'https://example.test' };
  }
  const target = previews.get(group.rows[0]!.id)?.target;
  return target?.name
    ? { text: `${group.rows.length} on ${target.name}`, url: target.url }
    : undefined;
}
