export default function useNotificationPreferences() {
  const saving = ref(new Set<NotificationCategoryKey>());

  const { data, pending, error, refresh } = useAsyncData(
    "notification-preferences",
    fetchNotificationPreferences,
  );

  const categories = computed(() => data.value?.categories ?? []);

  function replaceCategory(next: NotificationPreferenceCategory) {
    if (!data.value) return;
    data.value = {
      ...data.value,
      categories: data.value.categories.map((entry) =>
        entry.category === next.category ? next : entry,
      ),
    };
  }

  async function updatePreference(
    category: NotificationCategoryKey,
    patch: NotificationPreferencePatch,
  ) {
    const previous = categories.value.find((entry) => entry.category === category);
    if (!previous || saving.value.has(category)) return;

    saving.value.add(category);
    replaceCategory({ ...previous, ...patch });

    const res = await updateNotificationPreference(category, patch);

    saving.value.delete(category);

    if (res.error) {
      replaceCategory(previous);
      showActionFailedToast(notificationPreferenceLiterals.saveFailedAction);
    }
  }

  function isSaving(category: NotificationCategoryKey) {
    return saving.value.has(category);
  }

  return {
    categories,
    pending,
    error,
    refresh,
    isSaving,
    updatePreference,
  };
}
