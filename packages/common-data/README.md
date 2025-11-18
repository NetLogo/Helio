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
