export default defineNuxtRouteMiddleware(() => {
  const user = useUser();
  if (user.value.isLoggedIn) {
    return navigateTo("/models");
  }
});
