import { authRoutes } from "~/utils/auth";

const exemptPrefixes = [
  authRoutes.onboarding,
  authRoutes.login,
  authRoutes.signup,
  authRoutes.verifyEmail,
  authRoutes.resetPassword,
  authRoutes.passkey,
];

export default defineNuxtRouteMiddleware(async (to) => {
  if (exemptPrefixes.some((prefix) => to.path.startsWith(prefix))) {
    return;
  }

  const { $auth } = useNuxtApp();
  const session = await $auth.client.getSession();
  const user = session?.data?.user;
  if (!user) return;

  const onboardedAt = user.onboardedAt;
  if (onboardedAt) return;

  return navigateTo({
    path: authRoutes.onboarding,
    query: { next: to.fullPath },
  });
});
