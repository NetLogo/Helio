import { clampDescription } from "#shared/utils/seo";

type PageSeo = {
  title: string;
  description: string;
  ogType?: "website" | "article";
};

export const usePageSeo = ({ title, description, ogType = "website" }: PageSeo) => {
  const summary = clampDescription(description);
  useSeoMeta({
    title,
    description: summary,
    ogTitle: title,
    ogDescription: summary,
    ogType,
  });
};
