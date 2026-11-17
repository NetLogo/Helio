export default function useOnboarding() {
  const { $auth } = useNuxtApp();

  async function completeOnboarding(): Promise<void> {
    const userId = $auth.session.data.value?.user.id;
    if (!userId) throw new Error("Not authenticated");

    await markUserOnboarded(userId);

    await $auth.refresh();
  }

  return { completeOnboarding };
}
