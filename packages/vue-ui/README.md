# @repo/vue-ui

NetLogo's Nuxt UI and assets library.

## Setup

1. Add `@repo/vue-ui` as a depdendency to your project `package.json`.

```json
{
  "name": "your-project",
  //...
  "dependencies": {
    //...
    "@repo/vue-ui": "*"
    //...
  }
  //...
}
```

You also need to install `radix-vue` as a dependency (you only need it as a dev dependency for Nuxt to
resolve some built-in Nuxt overrides).

```bash
$> yarn add --dev radix-vue@^2.6.0         # Ensure version matches that in @repo/vue-ui
$> yarn install
```

2. Get the source and style file paths.

```ts
const vueUiSrc = '../../packages/vue-ui/src'
const vueUiStyles = vueUiSrc + '/styles.scss'
```

There is a more robust way to do this via `turbo-meta-utilities`, but this is sufficient for most use cases.

3. Update your `nuxt.config.ts` to include styles and components.

```ts
export default defineNuxtConfig({
  // other nuxt config...
  module: [
    'nuxt-svgo',                   // If you want to import svg assets
    // ...
  ]
  css: [
    vueUiStyles,
    // other styles...
  ],
  components: [
    {
      path: vueUiSrc,
      // Recommended options
      global: true,
      pathPrefix: false,
      pattern: '**/*.vue',
      ignore: ['**/examples/*.vue', '**/tests/*.vue'],
      watch: true,
    },
    // other component paths...
  ],

  vite: {
    // You must have tailwindcss configured in your project
    plugins: [tailwindcss()],
    // other vite config...
  },

  // other nuxt config...
})
```

4. Add to your tailwind config.

```css
@import 'tailwindcss';
# ...
@source "../../../../../packages/vue-ui/src";
```


## Structure

```
📂 @repo/vue-ui
├── assets/
│   ├── 📁 brands/          // Brand logos and assets
│   ├── 📁 images/          // Images for use across websites
│   └── ...
├── 📂 src/
│   ├── 📁 components/      // Vue components
│   ├── 📁 composables/     // Vue composables
│   ├── 📁 widgets/         // Pre-built widget components
│   ├── 📁 directives/      // Vue directives
│   ├── 📁 styles/          // (S)CSS styles and variables
│   ├── 📁 lib/             // Utilities and helper functions/modules
│   └── 📁 types/           // TypeScript type definitions
├── 📁 scripts/             // Build and utility scripts
└── 📁 playground/nuxt      // Nuxt playground for testing components
```

## Usage

### Import Structure

The exposed filesystem is as follows:

```
📂 @repo/vue-ui
├── assets/
│   ├── 📁 brands/      // Brand logos and assets
│   ├── 📁 images/      // Images for use across websites
│   └── ...
├── 📁 components/      // Vue components
├── 📁 composables/     // Vue composables
├── 📁 widgets/         // Pre-built widget components
├── 📁 directives/      // Vue directives
├── 📁 styles/          // (S)CSS styles and variables
├── 📁 lib/             // Utilities and helper functions/modules
├── 📁 types/           // TypeScript type definitions
└── 📄 styles.css       // Global styles and variables
```

### Components

Components are auto-imported and can be used directly in your Vue files. For example:

```html
<template>
  <!-- The button component applies styles (via `asChild`) ... -->
  <button variant="secondary" asChild>
    <!-- to the Anchor html replacement component  -->
    <Anchor href="https://example.com" target="_blank" rel="noopener noreferrer"> Visit Example.com </Anchor>
  </button>
</template>
```

#### Component Types

You must import component types from the corresponding component path.

```ts
import type { Props as ButtonProps } from '@repo/vue-ui/src/components/Button.vue'
```

### Composables

Composables can be imported and used in your Vue files.

### Assets

Assets can be imported and used in your Vue files.

```html
<template>
  <img :src="logo" alt="Brand Logo" />
</template>

<script setup lang="ts">
  import logo from '@repo/vue-ui/assets/brands/logo.svg'
</script>
```

## Development
There is one thing to keep in mind: this package does not build itself. Instead, it relies on
a Nuxt context to provide certain features (like module resolution, runtime config, etc). However, you might want
to test non-Nuxt component in isolation or export types for use in your Nuxt app.

### Type-checking
You can check types by running:
```bash
$> yarn run check-types
```
in the `@repo/vue-ui` package directory.

This will use the generated type file in the `docs` application to check types against a Nuxt context.

### Emitting types
You can emit type declaration files by running:
```bash
$> yarn run emit-types
```
in the `@repo/vue-ui` package directory.

This will generate type declaration files in the `dist` directory of the package. This uses a custom
`tsconfig.emit.json` file that does not know about Nuxt. It will ignore Nuxt imports and only emit types
for the parts of the code that do not depend on Nuxt.
