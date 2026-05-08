export default function useNetLogoVersions() {
  const prefix = ref("");
  const key = computed(() => `netlogo-versions-${prefix.value}`);

  const {
    data: versions,
    error,
    pending,
    refresh,
  } = useAsyncData<string[]>(key, () => fetchNetlogoVersionsByPrefix(prefix.value), {
    default: () => [],
    watch: [prefix],
  });

  return {
    prefix,
    versions,
    error,
    pending,
    refresh,
  };
}
