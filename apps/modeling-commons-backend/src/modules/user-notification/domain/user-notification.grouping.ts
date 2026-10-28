import notificationsConfig from '#src/config/notifications.ts';
import type {
  Digest,
  DigestItem,
  DigestRow,
  NotificationGroup,
  NotificationTargetType,
  ResolvedNotificationSubjects,
} from '#src/modules/user-notification/domain/user-notification.types.ts';
import { formatUserList } from '#src/shared/utils/formatters.ts';

export const targetPhrases: Record<NotificationTargetType, string> = {
  model: 'commented on',
};

export function isKnownTargetType(value: string): value is NotificationTargetType {
  return value in targetPhrases;
}

export function compareNewestFirst(a: DigestRow, b: DigestRow): number {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

export function getGroupKey(row: DigestRow): string {
  return row.targetType && row.targetId ? `${row.targetType}:${row.targetId}` : `row:${row.id}`;
}

export function groupNotifications(rows: ReadonlyArray<DigestRow>): Array<NotificationGroup> {
  const groups = new Map<string, NotificationGroup>();
  for (const row of [...rows].sort(compareNewestFirst)) {
    const key = getGroupKey(row);
    const group =
      groups.get(key) ??
      ({
        target: row.targetType && row.targetId ? { type: row.targetType, id: row.targetId } : null,
        actors: [],
        rowIds: [],
        title: row.title,
        url: row.url,
      } satisfies NotificationGroup);
    group.rowIds.push(row.id);
    if (row.actorUserId && !group.actors.some((actor) => actor.userId === row.actorUserId)) {
      group.actors.push({ userId: row.actorUserId, rowId: row.id });
    }
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function describeGroup(
  group: NotificationGroup,
  subjects: ReadonlyMap<string, ResolvedNotificationSubjects>,
): DigestItem | undefined {
  if (!group.target) return { text: group.title, url: group.url };
  if (!isKnownTargetType(group.target.type)) return undefined;

  const [firstRowId] = group.rowIds;
  const target = firstRowId ? subjects.get(firstRowId)?.target : undefined;
  if (!target) return undefined;
  if (!target.name || group.actors.length === 0) return { text: group.title, url: target.url };

  const names = group.actors
    .map((actor) => subjects.get(actor.rowId)?.actor?.name)
    .filter((name): name is string => Boolean(name));
  const who = formatUserList(names, group.actors.length);
  return { text: `${who} ${targetPhrases[group.target.type]} ${target.name}`, url: target.url };
}

export function buildDigest(
  rows: ReadonlyArray<DigestRow>,
  subjects: ReadonlyMap<string, ResolvedNotificationSubjects>,
): Digest {
  const items = groupNotifications(rows)
    .map((group) => describeGroup(group, subjects))
    .filter((item): item is DigestItem => item !== undefined);
  const cap = notificationsConfig.maxDigestItems;
  return { items: items.slice(0, cap), moreCount: Math.max(0, items.length - cap) };
}
