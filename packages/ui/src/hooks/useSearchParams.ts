import { useEffect, useState } from 'react';

export default function useSearchParams(): [
  URLSearchParams,
  (newParams: URLSearchParams, options: { replace?: boolean }) => void,
] {
  const [urlQuery, _setUrlQuery] = useState<URLSearchParams>(getUrlQuery());
  useEffect(() => {
    function onPopState(): void {
      _setUrlQuery(getUrlQuery());
    }
    window.addEventListener('popstate', onPopState);
    return (): void => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  const setUrlQuery = (newParams: URLSearchParams, options: { replace?: boolean } = {}): void => {
    const newRelativePathQuery =
      window.location.pathname + '?' + newParams.toString() + window.location.hash;
    if (options.replace === true) {
      window.history.replaceState(null, '', newRelativePathQuery);
    } else {
      window.history.pushState(null, '', newRelativePathQuery);
    }
    _setUrlQuery(newParams);
  };

  return [urlQuery, setUrlQuery];
}

export function getUrlQuery(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  if (!window.location.search) return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}
