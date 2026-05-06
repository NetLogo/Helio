export default async function useApiPagination<T>(
  key: MaybeRefOrGetter<string>,
  fetchPage: (page: number) => Promise<{
    data: Array<T>;
    page: number;
    count: number;
    limit: number;
  }>,
  initialPage = 1,
) {
  const page = ref(initialPage);
  const data = ref<Array<T>>([]) as Ref<Array<T>>;
  const count = ref<number>();
  const limit = ref<number>();
  const initialized = ref(false);

  const numberOfPages = computed(() =>
    count.value !== undefined && limit.value !== undefined
      ? Math.ceil(count.value / limit.value)
      : undefined,
  );

  const {
    data: fetchedPage,
    error,
    pending,
    refresh,
  } = await useAsyncData(
    () => `${toValue(key)}-page-${page.value}`,
    () => fetchPage(page.value),
    { watch: [page, () => toValue(key)] },
  );

  function reset() {
    data.value = [];
    count.value = undefined;
    limit.value = undefined;
    initialized.value = false;
    page.value = initialPage;
  }

  watch(() => toValue(key), reset);

  watch(
    fetchedPage,
    (next) => {
      if (!next) return;
      data.value = [...data.value, ...next.data];
      count.value = next.count;
      limit.value = next.limit;
      initialized.value = true;
    },
    { immediate: true },
  );

  const canLoadMore = computed(
    () =>
      !pending.value &&
      initialized.value &&
      numberOfPages.value !== undefined &&
      page.value < numberOfPages.value,
  );

  function loadNextPage() {
    if (canLoadMore.value) page.value += 1;
  }

  return {
    data,
    page,
    count,
    limit,
    error,
    pending,
    loadNextPage,
    canLoadMore,
    reset,
    refresh,
  };
}
