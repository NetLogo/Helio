type UserProfile = ResponseSuccessData<"GET", "/api/v1/users/{id}">;

function useProfileView(id: string) {
  const { GET } = useApi();

  const {
    data: profile,
    refresh,
    error,
    status,
  } = useAsyncData<UserProfile | null>(`profile-${id}`, async () => {
    const { data, error } = await GET("/api/v1/users/{id}", {
      params: { path: { id } },
    });
    if (error) {
      throw new Error(error || "Failed to load profile");
    }
    return data;
  });

  return { profile, refresh, error, status };
}

export default useProfileView;
export type { UserProfile };
