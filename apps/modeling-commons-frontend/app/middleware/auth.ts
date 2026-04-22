import { authRoutes } from "~/utils/auth";

export default defineNuxtRouteMiddleware((to) => {
  const user = useUser();
  if (!user.value.isLoggedIn) {
    return navigateTo({
      path: authRoutes.login,
      query: { next: to.fullPath },
    });
  }
});
