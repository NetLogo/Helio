function useTrackedField<T>(
  source: () => T,
  equals: (a: T, b: T) => boolean = (a, b) => a === b,
  toData: (value: T) => T = (value) => value,
) {
  const persisted = computed(source);
  const data = ref(toData(persisted.value)) as Ref<T>;
  watch(
    persisted,
    (v) => {
      data.value = toData(v);
    },
    { immediate: true },
  );
  const isDirty = computed(() => !equals(data.value, persisted.value));
  const reset = () => {
    data.value = toData(persisted.value);
  };
  return { data, persisted, isDirty, reset };
}

export default useTrackedField;
