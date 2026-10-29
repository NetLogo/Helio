import strings from "~/data/notification-preferences.json";

type NotificationPreferences = ResponseSuccessData<"GET", "/api/v1/me/notification-preferences">;
export type NotificationPreferenceCategory = NotificationPreferences["categories"][number];
export type NotificationCategoryKey = NotificationPreferenceCategory["category"];
export type NotificationEmailMode = NotificationPreferenceCategory["email"];
export type NotificationPreferencePatch = Partial<
  Pick<NotificationPreferenceCategory, "email" | "inApp">
>;

export default function useNotificationPreferences() {
  const api = useApi();
  const saving = ref(new Set<NotificationCategoryKey>());

  const { data, pending, error, refresh } = useAsyncData("notification-preferences", async () => {
    const { data, error } = await api.GET("/api/v1/me/notification-preferences");
    if (error) throw error;
    return data;
  });

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

    const res = await api.PATCH("/api/v1/me/notification-preferences", {
      body: { preferences: [{ category, ...patch }] },
    });

    saving.value.delete(category);

    if (res.error) {
      replaceCategory(previous);
      showActionFailedToast(strings.saveFailedAction);
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
