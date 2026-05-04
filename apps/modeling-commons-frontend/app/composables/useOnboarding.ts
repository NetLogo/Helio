export default function useOnboarding() {
  const { $auth } = useNuxtApp();
  const { PATCH } = useApi();

  async function completeOnboarding(): Promise<void> {
    const userId = $auth.session.data.value?.user.id;
    if (!userId) throw new Error("Not authenticated");

    await PATCH("/api/v1/users/{id}", {
      params: { path: { id: userId } },
      body: { onboardedAt: new Date().toISOString() },
    });

    await $auth.refresh();
  }

  return { completeOnboarding };
}
