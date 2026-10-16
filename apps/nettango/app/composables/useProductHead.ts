import { useSiteConfig } from "#site-config/app/composables";

const SITE_NAME = "NetTango";

export const useProductHead = () => {
  const route = useRoute();
  const siteUrl = useSiteConfig().url;
  const canonical = computed(() => new URL(route.path, siteUrl).href);

  useHead({
    titleTemplate: (chunk) => (chunk ? `${chunk} | ${SITE_NAME}` : SITE_NAME),
    link: [{ rel: "canonical", href: canonical }],
  });

  useSeoMeta({
    ogSiteName: SITE_NAME,
    ogType: "website",
    ogUrl: canonical,
    twitterCard: "summary_large_image",
  });
};
