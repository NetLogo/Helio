export default defineNuxtRouteMiddleware((to) => {
  const user = useUser();
  const nav = useSearchParamsNavigation({ query: to.query });
  if (user.value.isLoggedIn) {
    return navigateTo(nav.links.value.next.href);
  }
});
