type PreferenceChoice = Pick<NotificationPreferenceCategory, "inApp" | "email">;
type Choices = Record<NotificationCategoryKey, PreferenceChoice>;

const toChoices = (categories: NotificationPreferenceCategory[]): Choices =>
  Object.fromEntries(
    categories.map(({ category, inApp, email }) => [category, { inApp, email }]),
  ) as Choices;

const sameChoices = (a: Choices, b: Choices) => JSON.stringify(a) === JSON.stringify(b);

function changedFields(draft: PreferenceChoice, saved: PreferenceChoice): NotificationPreferencePatch {
  const patch: NotificationPreferencePatch = {};
  if (draft.inApp !== saved.inApp) patch.inApp = draft.inApp;
  if (draft.email !== saved.email) patch.email = draft.email;
  return patch;
}

export default function useNotificationPreferences() {
  const isSaving = ref(false);

  const { data, pending, error, refresh } = useAsyncData(
    "notification-preferences",
    fetchNotificationPreferences,
  );

  const categories = computed(() => data.value?.categories ?? []);
  const choices = useTrackedField(
    () => toChoices(categories.value),
    sameChoices,
    (value) => structuredClone(toRaw(value)),
  );

  function choose(category: NotificationCategoryKey, patch: NotificationPreferencePatch) {
    const current = choices.data.value[category];
    if (!current || isSaving.value) return;
    choices.data.value = { ...choices.data.value, [category]: { ...current, ...patch } };
  }

  async function save(): Promise<boolean> {
    if (!data.value || !choices.isDirty.value || isSaving.value) return false;
    const saved = choices.persisted.value;
    const draft = choices.data.value;
    const updates = categories.value
      .map(({ category }) => ({ category, ...changedFields(draft[category]!, saved[category]!) }))
      .filter((update) => Object.keys(update).length > 1);

    isSaving.value = true;
    try {
      const res = await updateNotificationPreferences(updates);
      if (res.error) return false;
      data.value = {
        ...data.value,
        categories: data.value.categories.map((entry) => ({ ...entry, ...draft[entry.category] })),
      };
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
