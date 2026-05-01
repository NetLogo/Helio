export default function useSearchParamsNavigation(): {
  goBack: () => void;
  goNext: () => void;
  links: ComputedRef<{
    back: { href: string };
    next: { href: string };
  }>;
} {
  const router = useRouter();

  const links = computed(() => {
    const currentQuery = router.currentRoute.value.query;
    return {
      back: {
        href: sanitizeHref(currentQuery.back ? String(currentQuery.back) : "/"),
      },
      next: {
        href: sanitizeHref(currentQuery.next ? String(currentQuery.next) : "/"),
      },
    };
  });

  function sanitizeHref(href: string) {
    try {
      const url = new URL(href, window.location.origin);
      return url.pathname + url.search + url.hash;
    } catch {
      return "/";
    }
  }

  function goBack() {
    const backHref = links.value.back.href;
    if (backHref) {
      navigateTo(backHref);
    } else {
      router.back();
    }
  }

  function goNext() {
    const nextHref = links.value.next.href;
    if (nextHref) {
      navigateTo(nextHref);
    } else {
      router.push("/");
    }
  }

  return {
    goBack,
    goNext,
    links,
  };
}
