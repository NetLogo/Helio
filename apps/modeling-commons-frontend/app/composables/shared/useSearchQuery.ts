import { refDebounced } from "@vueuse/core";

export default function useSearchQuery(queryKey: string, options: SearchQueryOptions = {}) {
  const {
    debounce: { ms = 300, maxWait = 1000 } = {},
    defaultValue = "",
    transform = (q) => q,
  } = options;

  const rawQuery = ref<string | undefined>(transform(defaultValue));
  const debouncedQuery = refDebounced(rawQuery, ms, { maxWait });

  const query = computed({
    get: () => debouncedQuery.value,
    set: (val: string) => {
      rawQuery.value = transform(val);
    },
  });

  return query;
}

export type SearchQueryOptions = {
  defaultValue?: string;
  debounce?: {
    ms?: number;
    maxWait?: number;
  };
  transform?: (query: string) => string | undefined;
};
