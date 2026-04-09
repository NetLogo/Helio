import * as z from "zod";

export const websiteConfigSchema = z
  .object({
    PRODUCT_NAME: z.string(),
    PRODUCT_VERSION: z.string().default("latest"),
    PRODUCT_WEBSITE: z.url(),
    PRODUCT_DISPLAY_NAME: z.string().optional(),
    PRODUCT_BUILD_DATE: z.string().optional(),
    PRODUCT_DESCRIPTION: z.string().optional(),
    PRODUCT_LONG_DESCRIPTION: z.string().optional(),
    PRODUCT_KEYWORDS: z.string().optional(),
    NO_AUTOGEN: z.string().optional(),
  })
  .transform((data) => ({
    productName: data.PRODUCT_NAME,
    productVersion: data.PRODUCT_VERSION,
    productWebsite: data.PRODUCT_WEBSITE,
    productDisplayName: data.PRODUCT_DISPLAY_NAME ?? data.PRODUCT_NAME,
    productFullName: [data.PRODUCT_NAME, data.PRODUCT_DISPLAY_NAME].filter(Boolean).join(" "),
    productBuildDate: data.PRODUCT_BUILD_DATE ? data.PRODUCT_BUILD_DATE : new Date().toISOString(),
    productDescription: data.PRODUCT_DESCRIPTION ?? "",
    productLongDescription: data.PRODUCT_LONG_DESCRIPTION ?? "",
    productKeywords: data.PRODUCT_KEYWORDS
      ? data.PRODUCT_KEYWORDS.split(",").map((k) => k.trim())
      : [],
    docsBuilderNoAutogen: ["true", "1", "yes"].includes(data.NO_AUTOGEN?.toLowerCase() ?? ""),
  }));
