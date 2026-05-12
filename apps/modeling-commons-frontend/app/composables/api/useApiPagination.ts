import type { AsyncDataOptions } from "#app/composables/asyncData";

export type PaginatedResponse<T> = {
  data: Array<T>;
  page: number;
  count: number;
  limit: number;
};

export default function useApiPagination<T>(
  key: MaybeRefOrGetter<string>,
  fetchPage: (page: number) => Promise<PaginatedResponse<T>>,
  asyncDataOptions: Partial<AsyncDataOptions<PaginatedResponse<T>>> = {},
  initialPage = 1,
) {
  const page = useState(`${toValue(key)}-pagination-page`, () => initialPage);
  const data = ref<Array<T>>([]) as Ref<Array<T>>;
  const count = ref<number>();
  const limit = ref<number>();
  const initialized = ref(false);
  const isKeyStale = ref(false);

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
  } = useAsyncData(
    () => `${toValue(key)}-page-${page.value}`,
    () => fetchPage(page.value),
    { watch: [page, () => toValue(key)], ...asyncDataOptions },
  );

  function reset() {
    data.value = [];
    count.value = undefined;
    limit.value = undefined;
    initialized.value = false;
    page.value = initialPage;
  }

  function _setStaleKey() {
    isKeyStale.value = true;
  }

  function _clearStaleKey() {
    if (!isKeyStale.value) return;
    reset();
    isKeyStale.value = false;
  }

  watch(() => toValue(key), _setStaleKey);

  watch(
    fetchedPage,
    (next) => {
      if (!next) return;
      _clearStaleKey();
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
