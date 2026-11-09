import notificationsConfig from '#src/config/notifications.ts';
import type {
  Digest,
  DigestItem,
  NotificationRow,
  NotificationGroup,
  NotificationPreviews,
  NotificationProducer,
} from '#src/modules/user-notification/domain/user-notification.types.ts';

type ProducerGroup = { producer: NotificationProducer; group: NotificationGroup };

type ProducerByCategory = ReadonlyMap<string, NotificationProducer>;

export function compareNewestFirst(a: NotificationRow, b: NotificationRow): number {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

export function getGroupKey(row: NotificationRow, producerName: string): string {
  return row.targetType && row.targetId
    ? `${producerName}:${row.targetType}:${row.targetId}`
    : `row:${row.id}`;
}

export function groupNotifications(
  rows: ReadonlyArray<NotificationRow>,
  producerByCategory: ProducerByCategory,
): Array<ProducerGroup> {
  const groups = new Map<string, ProducerGroup>();
  for (const row of [...rows].sort(compareNewestFirst)) {
    const producer = producerByCategory.get(row.category);
    if (!producer) continue;

    const key = getGroupKey(row, producer.name);
    const entry =
      groups.get(key) ??
      ({
        producer,
        group: {
          target:
            row.targetType && row.targetId ? { type: row.targetType, id: row.targetId } : null,
          actors: [],
          rows: [],
        },
      } satisfies ProducerGroup);
    entry.group.rows.push(row);
    if (row.actorUserId && !entry.group.actors.some((actor) => actor.userId === row.actorUserId)) {
      entry.group.actors.push({ userId: row.actorUserId, rowId: row.id });
    }
    groups.set(key, entry);
  }
  return [...groups.values()];
}

export function buildDigest(
  rows: ReadonlyArray<NotificationRow>,
  previews: ReadonlyMap<string, NotificationPreviews>,
  producerByCategory: ProducerByCategory,
): Digest {
  const items = groupNotifications(rows, producerByCategory)
    .map(({ producer, group }) => producer.describeGroup(group, previews))
    .filter((item): item is DigestItem => item !== undefined);
  const cap = notificationsConfig.maxDigestItems;
  return { items: items.slice(0, cap), moreCount: Math.max(0, items.length - cap) };
}
