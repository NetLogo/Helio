export default function useOnboarding() {
  const apiBase = useRuntimeConfig().public.apiBase as string;
  const { $auth } = useNuxtApp();

  async function completeOnboarding(): Promise<void> {
    const userId = $auth.session.value?.data?.user?.id;
    if (!userId) throw new Error("Not authenticated");

    const res = await fetch(`${apiBase}/api/v1/users/${userId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardedAt: new Date().toISOString() }),
    });

    if (!res.ok) {
      throw new Error(`Failed to complete onboarding: ${res.status}`);
    }

    const { data } = await $auth.client.getSession({
      query: { disableCookieCache: true },
    });
    $auth.session.value = {
      ...$auth.session.value,
      data,
      isPending: false,
    };
  }

  return { completeOnboarding };
}
