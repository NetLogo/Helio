import { WebsiteLogo } from "~/assets/website-logo";

export function useWebsite() {
  const {
    public: { website: websiteConfig },
  } = useRuntimeConfig();
  return ref<{
    name: string;
    fullName: string;
    logo: string;
    description: string;
    longDescription: string;
    url: string;
    keywords: Array<string>;
  }>({
    name: websiteConfig.productName,
    fullName: websiteConfig.productDisplayName,
    logo: WebsiteLogo,
    description: websiteConfig.productDescription,
    longDescription: websiteConfig.productLongDescription,
    url: websiteConfig.productWebsite,
    keywords: websiteConfig.productKeywords,
  });
}
