import { authRoutes } from "~/utils/auth";

const exemptPrefixes = [
  authRoutes.onboarding,
  authRoutes.login,
  authRoutes.signup,
  authRoutes.verifyEmail,
  authRoutes.resetPassword,
  authRoutes.passkey,
];

export default defineNuxtRouteMiddleware((to) => {
  if (exemptPrefixes.some((prefix) => to.path.startsWith(prefix))) {
    return;
  }

  const user = useUser();
  if (!user.value.isLoggedIn) return;

  const onboardedAt = (user.value.user as { onboardedAt?: string | null } | null)?.onboardedAt;
  if (onboardedAt) return;

  return navigateTo({
    path: authRoutes.onboarding,
    query: { next: to.fullPath },
  });
});
