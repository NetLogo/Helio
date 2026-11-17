const USERS_PAGE_LIMIT = 20;

export async function fetchUser(id: string): Promise<UserProfile> {
  const { data, error } = await useApi().GET("/api/v1/users/{id}", {
    params: { path: { id } },
  });
  return handleApiError(data, error, "fetching user profile");
}

export async function fetchUserById(id: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await useApi().GET("/api/v1/users/{id}", {
      params: { path: { id } },
    });
    return handleApiError(data, error, "fetching user");
  } catch (e) {
    console.error("Error fetching user", e);
    return null;
  }
}

export async function fetchUsers(page: number, keyword?: string): Promise<UsersPage> {
  const { data, error } = await useApi().GET("/api/v1/users", {
    params: {
      query: { limit: USERS_PAGE_LIMIT, page, keyword },
    },
  });
  return handleApiError(data, error, "fetching users");
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const { data, error } = await useApi().GET("/api/v1/users/whoami");
  return handleApiError(data, error, "fetching current user info");
}

export async function markUserOnboarded(id: string): Promise<void> {
  await useApi().PATCH("/api/v1/users/{id}", {
    params: { path: { id } },
    body: { onboardedAt: new Date().toISOString() },
  });
}

export function uploadAvatarImage(file: File) {
  const form = new FormData();
  form.append("file", file);
  return useApi().POST("/api/v1/uploads/avatar", {
    // @ts-expect-error - FormData doesn't type well with openAPI
    // -Omar Ibrahim, May 04 26
    body: form as unknown,
  });
}
