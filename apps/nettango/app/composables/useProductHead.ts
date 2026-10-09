const PRODUCT_NAME = "NetTango Builder by NetLogo";

export const useProductHead = () => {
  useHead({
    titleTemplate: (chunk) => (chunk ? `${chunk} - ${PRODUCT_NAME}` : PRODUCT_NAME),
  });

  useSeoMeta({
    ogSiteName: PRODUCT_NAME,
    ogType: "website",
    twitterCard: "summary_large_image",
  });
};
