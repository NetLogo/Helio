type UserProfile = ResponseSuccessData<"GET", "/api/v1/users/{id}">;

function useProfile() {
  const { GET } = useApi();
  const user = useUser();

  const userId = computed(() => (user.value.isLoggedIn ? user.value.user.id : null));

  const { data: profile, refresh, status } = useAsyncData<UserProfile | null>(
    "profile",
    async () => {
      if (!userId.value) return null;

      const res = await GET("/api/v1/users/{id}", {
        params: { path: { id: userId.value } },
      });

      return res.data ?? null;
    },
    { watch: [userId] },
  );

  return { profile, refresh, status };
}

export default useProfile;
export type { UserProfile };
