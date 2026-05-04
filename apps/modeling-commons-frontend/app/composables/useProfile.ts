type UserProfile = ResponseSuccessData<"GET", "/api/v1/users/{id}">;

function useProfile() {
  const user = useUser();
  const auth = useNuxtApp().$auth;

  const profile = computed(() => user.value?.user);
  const refresh = () => auth.refresh();

  return { profile, refresh };
}

export default useProfile;
export type { UserProfile };
