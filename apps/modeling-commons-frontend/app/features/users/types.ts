export type UserProfile = ResponseSuccessData<"GET", "/api/v1/users/{id}">;
export type UsersPage = ResponseSuccessData<"GET", "/api/v1/users">;
export type CurrentUser = ResponseSuccessData<"GET", "/api/v1/users/whoami">;
