import { useMemo } from 'react';
import useSearchParams from './useSearchParams';

export function useUrlState<T extends Record<string, string | undefined>>(): readonly [
  Record<string, string | undefined>,
  (s: Partial<T>) => void,
  URLSearchParams,
] {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryParams = useMemo(() => {
    const paramsObj: Record<string, string | undefined> = {};
    searchParams.forEach((v, k) => {
      paramsObj[k] = v;
    });
    return paramsObj;
  }, [searchParams]);

  function setQueryParams(s: Partial<T>): void {
    const newSearchParams = new URLSearchParams(searchParams);
    Object.keys(s).forEach((k) => {
      if (typeof s[k] === 'string') {
        newSearchParams.set(k, s[k]);
      } else {
        newSearchParams.delete(k);
      }
    });
    setSearchParams(newSearchParams, { replace: true });
  }

  return [queryParams, setQueryParams, searchParams] as const;
}
