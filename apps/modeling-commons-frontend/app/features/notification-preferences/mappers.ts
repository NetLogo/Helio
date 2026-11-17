import { notificationPreferenceLiterals } from "~/features/notification-preferences/literals";
import type {
  NotificationCategoryKey,
  NotificationPreferenceCategory,
  NotificationPreferenceChange,
  NotificationPreferenceChoice,
  NotificationPreferenceChoices,
  NotificationPreferencePatch,
} from "~/features/notification-preferences/types";

export function getPreferenceChoices(
  categories: NotificationPreferenceCategory[],
): NotificationPreferenceChoices {
  return Object.fromEntries(
    categories.map(({ category, inApp, email }) => [category, { inApp, email }]),
  ) as NotificationPreferenceChoices;
}

export function copyChoices(choices: NotificationPreferenceChoices): NotificationPreferenceChoices {
  return structuredClone(choices);
}

export function areChoicesEqual(
  a: NotificationPreferenceChoices,
  b: NotificationPreferenceChoices,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function getChangedPreferences(
  draft: NotificationPreferenceChoices,
  saved: NotificationPreferenceChoices,
): NotificationPreferenceChange[] {
  const categories = Object.keys(draft) as NotificationCategoryKey[];
  return categories.flatMap((category) => {
    const patch = getChangedFields(draft[category]!, saved[category]!);
    return Object.keys(patch).length ? [{ category, ...patch }] : [];
  });
}

function getChangedFields(
  draft: NotificationPreferenceChoice,
  saved: NotificationPreferenceChoice,
): NotificationPreferencePatch {
  return {
    ...(draft.inApp !== saved.inApp && { inApp: draft.inApp }),
    ...(draft.email !== saved.email && { email: draft.email }),
  };
}

export function getCategoryIcon(category: NotificationCategoryKey): string {
  return notificationPreferenceLiterals.categoryIcons[category];
}
