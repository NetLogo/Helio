function useTrackedField<T>(source: () => T, equals: (a: T, b: T) => boolean = (a, b) => a === b) {
  const persisted = computed(source);
  const data = ref(persisted.value) as Ref<T>;
  watch(
    persisted,
    (v) => {
      data.value = v;
    },
    { immediate: true },
  );
  const isDirty = computed(() => !equals(data.value, persisted.value));
  const reset = () => {
    data.value = persisted.value;
  };
  return { data, persisted, isDirty, reset };
}

export default useTrackedField;
