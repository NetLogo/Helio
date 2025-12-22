# Common Data

`@nuxt/content` supports querying data from various formats. This package hosts common data to be used throughout the monorepo.

## Datasets

### Primitives
NetLogo primitives come from different sources and are transformed to URLs in different ways. This dataset allows look-up by `name`, `id`, `source`, or `url`.

Whenever you change the `documentation.yaml` in an extension folder or the source of truth for primitives in `apps/docs/autogen`, you should also rebuild this dataset by running:

```
node src/primitives.js
```

or rebuild the whole package with:

```
yarn run build
```

We introduced this feature to allow monorepo sourcing via @nuxt/content. An example is found in `apps/learn/content.config.ts`. A simplified example of using the dataset is:

```ts
import { defineCollection, defineContentConfig } from '@nuxt/content';
import { PrimitiveSchema } from '@repo/common-data';
import { fileURLToPath } from 'url';
import z from 'zod';

const PrimitiveDataSchema = z.object({
  primitives: z.array(PrimitiveSchema),
});

export default defineContentConfig({
  collections: {
    primitives: defineCollection({
      type: 'data',
      source: fileURLToPath(import.meta.resolve('@repo/common-data/datasets/primitives.yaml')),
      schema: PrimitiveDataSchema,
    })
  },
});
```
