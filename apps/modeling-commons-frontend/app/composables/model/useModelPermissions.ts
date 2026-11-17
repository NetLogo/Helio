import type { MaybeRefOrGetter } from "vue";

export default function useUserModelPermissions(modelId: MaybeRefOrGetter<string>) {
  const id = computed(() => toValue(modelId));

  const result = useAsyncData<UserModelPermissions | null>(
    () => `user-model-permissions-${id.value}`,
    () => (id.value ? fetchModelPermissions(id.value) : Promise.resolve(null)),
    { watch: [id], immediate: true, dedupe: "cancel" },
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
