import { websiteConfigSchema as rootWebsiteConfigSchema } from '@repo/nuxt-core/runtime.config.schema';
import z from 'zod';

const extraWebsiteConfig = z
  .object({
    VERSIONS_SRC: z.string().default('/versions.json'),
  })
  .transform((data) => ({
    versionsSrc: data.VERSIONS_SRC,
  }));

const websiteConfigSchema = rootWebsiteConfigSchema
  .transform((data) => ({
    ...data,
    productIsBeta: data.productVersion.toLowerCase().includes('beta'),
  }))
  .and(extraWebsiteConfig);

export { websiteConfigSchema };
