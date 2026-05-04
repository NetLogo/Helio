import type { LocationQuery } from "vue-router";

function sanitizeHref(href: string, allowedOrigins: string[]): string | null {
  if (href.startsWith("/")) {
    return href;
  }
  try {
    // URL needs a base; first allowed origin is the canonical "self" for parsing
    const url = new URL(href, allowedOrigins[0]);
    if (!allowedOrigins.includes(url.origin)) {
      return null;
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export default function useSearchParamsNavigation({
  query,
  fallback = "/",
  allowedOrigins,
}: {
  query?: LocationQuery;
  fallback?: string;
  allowedOrigins?: Array<string>;
}): {
  goBack: () => void;
  goNext: () => void;
  links: ComputedRef<{
    back: { href: string };
    next: { href: string };
  }>;
} {
  const router = useRouter();
  const requestURL = useRequestURL();
  const origins = Array.from(new Set([...(allowedOrigins ?? []), requestURL.origin]));

  const currentQuery = computed(() => query ?? router.currentRoute.value.query);

  const resolve = (key: "back" | "next"): string => {
    const raw = currentQuery.value[key];
    if (!raw) return fallback;
    return sanitizeHref(String(raw), origins) ?? fallback;
  };

  const links = computed(() => ({
    back: { href: resolve("back") },
    next: { href: resolve("next") },
  }));

  function goBack() {
    const href = links.value.back.href;
    if (href !== fallback) {
      navigateTo(href);
    } else {
      router.back();
    }
  }

  function goNext() {
    const href = links.value.next.href;
    if (href !== fallback) {
      navigateTo(href);
    } else {
      router.push(fallback);
    }
  }

  return { goBack, goNext, links };
}
