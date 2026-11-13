export default async function useNotificationPreferences() {
  const { data, pending, error, refresh } = await useAsyncData(
    "notification-preferences",
    fetchNotificationPreferences,
  );
  const categories = computed(() => data.value?.categories ?? []);

  const choices = useTrackedField(
    () => getPreferenceChoices(categories.value),
    areChoicesEqual,
    copyChoices,
  );
  const isSaving = ref(false);

  function choose(category: NotificationCategoryKey, patch: NotificationPreferencePatch) {
    choices.data.value[category] = { ...choices.data.value[category]!, ...patch };
  }

  async function save(): Promise<boolean> {
    const changes = getChangedPreferences(choices.data.value, choices.persisted.value);
    if (!changes.length || isSaving.value) return false;

    isSaving.value = true;
    try {
      const { error } = await updateNotificationPreferences(changes);
      if (error) return false;
      await refresh();
      return true;
    } catch {
      return false;
    } finally {
      isSaving.value = false;
    }
  }

  return {
    categories,
    choices: choices.data,
    isDirty: choices.isDirty,
    isSaving,
    pending,
    error,
    refresh,
    choose,
    reset: choices.reset,
    save,
  };
}
