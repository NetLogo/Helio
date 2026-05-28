import type { MaybeRefOrGetter } from "vue";

type UserModelPermissions = ResponseSuccessData<"GET", "/api/v1/models/{id}/me/permissions">;

export default function useUserModelPermissions(modelId: MaybeRefOrGetter<string>) {
  const { GET } = useApi();
  const id = computed(() => toValue(modelId));

  const result = useAsyncData<UserModelPermissions | null>(
    () => `user-model-permissions-${id.value}`,
    async () => {
      if (!id.value) return null;
      const { data, error } = await GET("/api/v1/models/{id}/me/permissions", {
        params: { path: { id: id.value } },
      });
      if (error) throw error;
      return data ?? null;
    },
    { watch: [id] },
  );

  const data = computed<UserModelPermissions>(() => {
    if (result.status.value === "success") return result.data.value as UserModelPermissions;
    return new Proxy({} as UserModelPermissions, {
      get: () => {
        return false;
      },
    });
  });

  return { ...result, data };
}

export type { UserModelPermissions };
