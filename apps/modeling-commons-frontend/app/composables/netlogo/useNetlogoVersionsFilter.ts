import {
  toNetLogoVersionItem,
  type NetLogoVersionItem,
} from "~/components/netlogo/NetLogoVersionSelectMenu.vue";

export function useNetlogoVersionsFilter(
  filters: Ref<{ netlogoVersion?: string }>,
  setFilter: (key: "netlogoVersion", value: string | undefined) => void,
) {
  const { prefix: searchTerm, versions, pending } = useNetlogoVersions();

  const selected = ref<NetLogoVersionItem>();

  watch(
    () => filters.value.netlogoVersion,
    (version) => {
      selected.value = version ? toNetLogoVersionItem(version) : undefined;
    },
    { immediate: true },
  );

  watch(selected, (item) => {
    setFilter("netlogoVersion", item?.value);
  });

  return {
    selected,
    searchTerm,
    versions,
    pending,
  };
}
