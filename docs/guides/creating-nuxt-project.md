# Creating Nuxt Project

> :warning: This guide is no longer relevant and needs to be updated. (TODO)

1. Copy `packages/nuxt-core` to `apps/<your-nuxt-app>`.
2. Rename `package.target.json` to `package.json` (deleting the original `package.json` if it exists).
3. Modify the `name` field in `package.json` to match your app name.
```json
{
  "name": "<your-nuxt-app>",
  ...
}
```

Then, update the ports in the `scripts` section as needed. Ideally, the port number should be `30XX`, where `XX` is a unique number for your app.
```json
"scripts": {
  "nuxt:dev": "nuxt dev --port 30XX",
  ...
}
```
4. Install dependencies by running:
```bash
cd apps/<your-nuxt-app>
yarn install
```
5. Modify `nuxt.config.ts` to enable any desired modules or configurations. Use `deepMerge` to combine the base config with your custom settings.
```ts
// https://nuxt.com/docs/api/configuration/nuxt-config
import { nuxtBaseConfig } from "@repo/nuxt-core/nuxt.config.ts";
import { deepMerge } from "@repo/utils/std/objects";
export default defineNuxtConfig(
  deepMerge(nuxtBaseConfig as Record<string, unknown>, {
    devtools: {
      enabled: true,
    },
    ssr: true,
  }),
);
```
5. Modify the `.env` and the `app/assets/website-meta.json` files to reflect your app's details (e.g., product name, website, etc.).
6. Modify the `app/assets/website-logo.ts` file to export your app's logo.
