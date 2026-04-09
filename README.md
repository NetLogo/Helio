# Helio Documentation

<p align="center">

<img src="./docs/assets/brand/1x/logo_dark.png" alt="Helio Logo" width="480" height="147" style="max-width: 384px; object-fit: contain;" />

</p>

**Helio** is a monorepo for NetLogo-related website, web  applications and shared packages, maintained by the Center for Connected Learning (CCL) at Northwestern University. This project represents the modern web ecosystem for NetLogo documentation, tools, and educational resources.

For development guides, contribution instructions, and more, please refer to the [guides section](./docs/guides/index.md).

## Architecture

**Monorepo Structure** - Turborepo-managed workspace with:
- **Applications**: Nuxt v4 and Vue 3.5
- **Packages**: Shared components, utilities, and build tools
- **External**: NetLogo extension documentation system

## Tech Stack
- **TypeScript**
- **Nuxt v4** - Metaframework for Vue
- **Vue** - Application Library
- **TailwindCSS** - Styling
- **ESLint** - Linter
- **Prettier** - Formatter
- **Zod** - Object validation

The UI uses Nuxt UI, which is built on top of RekaUI, both are available as dependencies if
your project is configured correctly.

## Directory Structure

```
📂 Helio/
├── 📂 apps/
│   ├── 📁 docs/                    # docs.netlogo.org website
│   ├── 📁 netlogo/                 # NetLogo.org website
│   ├── 📁 learn/                   # NetLogo tutorials and guides
│   └── 📁 nettango/                # NetTango landing page
├── 📂 packages/
│   ├── 📁 vue-ui/                  # Vue component library with Reka UI in Nuxt
│   ├── 📁 markdown/                # NetLogo markdown renderer
│   ├── 📁 template/                # Mustache/Handlebars template engine
│   ├── 📁 netlogo-docs/            # NetLogo documentation shared generators
│   ├── 📁 utils/                   # Shared utilities
│   ├── 📁 nuxt-content-assets/     # Nuxt content asset management
│   ├── 📁 nuxt-core/               # Root configuration for Nuxt websites
│   ├── 📁 tailwind-config/         # Shared Application Themes
│   ├── 📁 typescript-config/       # Shared TypeScript configurations
│   └── 📁 eslint-config/           # Shared ESLint configurations
├── 📂 external/
│   └── extensions/                 # NetLogo extension documentation
└── 📂 static/                      # Static assets and favicons
```

## Getting Started
1. **Install Requirements**
   - [Node.js v24](https://nodejs.org/en/download/)
   - [Yarn v1](https://classic.yarnpkg.com/lang/en/docs/install/)
   - [Git Bash](https://git-scm.com/install/windows) (for Windows users)

2. **Clone the Repository**

```bash
git clone https://github.com/NetLogo/Helio.git
cd Helio
```

3. **Run the initialization script**
> :warning: Use Git Bash if running on Windows.

```bash
yarn run init
```

## FAQ

### Repo layout

#### What is the difference between `apps/` and `packages/`?

- **`apps/`** - deployable websites. Each one is its own Nuxt app with its own `nuxt.config.ts`, routes, and deploy target (`docs`, `netlogo`, `learn`, `nettango`).
- **`packages/`** - shared, non-deployable code consumed by the apps via the `@repo/*` workspace alias. Things like `vue-ui`, `nuxt-core`, `tailwind-config`, `markdown`, `utils`, and the shared `eslint-config` / `typescript-config`.

If something ships to users as a URL, it belongs in `apps/`. If multiple apps need it, it belongs in `packages/`.

**Packages follow the single-responsibility principle.** Each package should do one thing, Unix-style, and do it well - `markdown` renders markdown, `tailwind-config` holds themes, `utils` provides pure helpers, `vue-ui` owns components. A well-scoped package should rarely need to change, because its surface area is narrow. If you find yourself reaching into a package to add unrelated behavior, that is a signal the behavior belongs in a new package (or in the app consuming it), not bolted onto an existing one.

#### What does `@repo/*` resolve to?

Nothing magic - it's just the Yarn v1 workspace alias for `packages/*`. You can `cd` into any package and edit it directly; apps pick up the change through the workspace symlink.

#### What is `external/` for?

It holds the NetLogo extension documentation sources (not a workspace package). The `docs` app pulls from it when generating extension reference pages. Treat it as an input to the markdown pipeline, not as code you import.

#### Where do static assets, favicons, and fonts live?

Three places, by scope:
- **`static/`** (repo root) - shared favicons and cross-site assets.
- **`apps/<app>/public/`** - assets owned by a single app.
- **`@repo/vue-ui/assets/`** - brand logos, images, and fonts shared across apps, imported from components.

#### How do I add a new app or a new package?

Copy the closest existing sibling (e.g. `apps/nettango` for a new app, or any small package for a new one), rename it in `package.json`, and add it to the workspace. The [creating-nuxt-project](./docs/guides/creating-nuxt-project.md) guide covers the Nuxt side but is somewhat outdated - use it as a reference, not a script. Note: `packages/template` is **not** a scaffolding template; it's a Mustache/Handlebars template engine.

### Styling

#### How do I style an app? Why are there two themes (`docs-theme` and `netlogo-theme`)?

All styling is centralized in `@repo/tailwind-config` under `scss/`. Each app picks a theme by importing it from its own `app/assets/styles/main.scss`:

```scss
@layer website {
  @include meta.load-css("@repo/tailwind-config/scss/normalize.scss");
  @include meta.load-css("@repo/tailwind-config/scss/netlogo-theme.scss"); // or docs-theme.scss
}
```

- **`netlogo-theme`** - the marketing/website look used by `netlogo` and `nettango`. It applies the NetLogo brand defaults globally and scopes documentation-like typography (headings, TOC, prose) to a `.docs` class so only opt-in regions get the docs treatment.
- **`docs-theme`** - used by the `docs` app (docs.netlogo.org). It applies docs typography globally (headings, TOC, prose) plus docs-specific layout rules for things like dictionary entries and scroll-margin.

Both themes are composed from the same building blocks (`netlogo-mixins.scss`, `docs-mixins.scss`), so edit the mixins when you want a change to affect every site, and edit the `*-theme.scss` file when you only want to change one family.

Unless fixing a bug or making a global change, treat these as open-for-expansaion, closed for modification. You may introduce a new theme if desired following the same pattern.

### Components & UI

#### Why are there three UI libraries (`@repo/vue-ui`, Nuxt UI, and Reka UI)? Which should I use?

They are layered, not alternatives:

- **Reka UI** - the lowest level. Unstyled, accessible Vue primitives (menus, dialogs, popovers). Use directly only when you need a primitive no one has wrapped yet.
- **Nuxt UI v4** - sits on top of Reka UI and provides styled, themeable components. Available in any app that pulls in `nuxt-core`.
- **`@repo/vue-ui`** - our in-house component library. This is what you should reach for first. It contains NetLogo-branded components (navbar, footer, catalog, widgets), shared composables, brand assets, and HOCs. Components are auto-imported when the package is wired into `nuxt.config.ts` (see `packages/vue-ui/README.md`).

Rule of thumb: **vue-ui → Nuxt UI → Reka UI**, in that order. Only drop down a level when the one above does not have what you need.

#### Where do I put a new shared component?

In `packages/vue-ui/src/components/` (or `widgets/` for larger, composed pieces). It will be auto-imported by any app that has vue-ui wired into its `nuxt.config.ts`. Remember to import component prop types from the component's own path, e.g. `import type { Props } from '@repo/vue-ui/src/components/Button.vue'` - vue-ui does not pre-bundle its types, it relies on the consuming Nuxt app's context.

### Nuxt & shared config

#### Why is there a `nuxt-core` package if every app already has its own `nuxt.config.ts`?

`@repo/nuxt-core` is the shared baseline for every Nuxt app in the repo. It provides the common Nuxt layers, modules, plugins, runtime config schema (`runtime.config.schema.ts`), the default layout, the shared `main.scss` entry, and composables like `useWebsite`. Apps extend it and override only what is app-specific - this is why you will see very thin `nuxt.config.ts` files in `apps/*`.

#### What does `useWebsite` from `@repo/nuxt-core` do?

It's a small shared composable that exposes the current site's identity (name, full name, description, URL, keywords, logo) as a reactive ref, pulled from `runtimeConfig.public.website`. Use it whenever a component needs to render something site-aware (page titles, meta tags, footer copy, OG images) instead of hard-coding strings per app:

```ts
const website = useWebsite()
useHead({ title: website.value.fullName })
```

On the client it's wrapped in `createSharedComposable`, so every caller gets the same ref - there is no cost to calling it from many components.

### Content authoring

#### How do I author or build content with the markdown system?

Content authoring (frontmatter, directives, custom components, how Nuxt Content is wired into the apps, and how documentation is generated from markdown) is covered in its own guide. Start here:

- [Building Markdowns](./docs/guides/building-markdowns.md) - the authoritative guide for the markdown pipeline powered by `@repo/markdown` and `@repo/netlogo-docs`.

### Dev workflow & tooling

#### How does Turborepo fit in? Do I need to learn it?

Mostly no. All day-to-day commands go through the root `package.json`:

```bash
yarn dev           # turbo run dev       - starts every app in parallel
yarn build         # turbo run build     - builds everything with caching (apps are excluded)
yarn lint          # turbo run lint
yarn check-types   # turbo run check-types
yarn test          # turbo run test
```

Turbo handles task ordering (`^build` means "build my dependencies first"), caches outputs in `dist/`, `.next/`, etc., and reads `.env` files as part of the cache key. If a build acts stale, `turbo.json` is where inputs/outputs are declared.

To work on a single app only, `cd` into it and run its own `yarn dev` - Turbo is not required at the leaf level.

#### How do environment variables work?

Env files are a global Turbo dependency (`.env`, `.env.local`, and any `.env*` in an app). The `yarn init` script generates a starting `.env` via the per-package `create:env` task. `.env` is gitignored - never commit it. If you add a new variable, declare it in the relevant runtime config schema so it is typed and validated.

#### Why doesn't my change to a package show up in the app?

Most of the time it just works - `@repo/vue-ui` in particular is sourced as a directory (via `components: [{ path: vueUiSrc, watch: true }]`), so edits HMR into the app live. If you changed something outside that watched path (a composable, a type, a package's `package.json`, or anything consumed through a built export), restart `yarn dev`.

#### How do I debug a failing Turbo build?

Run `yarn build --force` to bypass the cache, or `turbo run build --filter=<app>` to isolate one target. Remember that `.env*` changes invalidate the cache, and per-task inputs/outputs are declared in `turbo.json`.

#### What are the repo health scripts I see in `package.json`?

- `yarn check-dupes` - flags duplicated dependencies across workspaces.
- `yarn check-deps-health` - sanity-checks dependency versions.
- `yarn sync-deps` - aligns versions across workspaces.
- `yarn clean-up` - clears stale file watchers (useful on macOS when `dev` misbehaves).
- `yarn pre-push` - the same check that runs before pushing; run it manually if you want to catch issues early.

## Helpful Commands

### Repo-level (run from the repo root)

| Command | What it does |
| --- | --- |
| `yarn init` | One-time setup: installs dependencies and bootstraps `.env` files. |
| `yarn dev` | Starts every app in parallel via Turbo (only packages). |
| `yarn build` | Builds all workspaces with caching (only packages). |
| `yarn lint` | Runs ESLint across all workspaces. |
| `yarn check-types` | Runs TypeScript type-checking across all workspaces. |
| `yarn test` | Runs the test suites. |
| `yarn format` | Formats `*.{ts,tsx,md}` with Prettier. |
| `yarn pre-push` | Runs the same checks the pre-push hook runs — use it before pushing. |
| `yarn clean-up` | Clears stale file watchers (macOS fix when `dev` misbehaves). |

### App-level (run from `apps/<app>/`)

Every Nuxt app exposes the same baseline scripts:

| Command | What it does |
| --- | --- |
| `yarn nuxt:dev` | Starts just this app's dev server. |
| `yarn nuxt:prepare` | Regenerates Nuxt's `.nuxt/` types and module artifacts. Run this after pulling, switching branches, or when your editor complains about missing types. |
| `yarn nuxt:build` | Builds this app for production. |
| `yarn nuxt:preview` | Serves the built output locally. |
| `yarn lint` / `yarn lint:fix` | Lints just this app. |
| `yarn check-types` | Type-checks just this app. |

Individual apps may expose extra scripts (e.g. `docs:*` in `apps/docs`). Check the app's `package.json`.

## Conventions

- **Apps are deployable, packages are shared.** If it has a URL, it lives in `apps/`. If multiple apps consume it, it lives in `packages/`.
- **Packages are single-responsibility.** One package, one job. Add a new package rather than widening an existing one.
- **Workspace imports use `@repo/*`.** Never reach into a sibling by relative path.
- **UI layering: vue-ui → Nuxt UI → Reka UI.** Reach for the highest layer that satisfies your need.
- **Shared components live in `@repo/vue-ui`.** Component prop types are imported from the component's own path (`@repo/vue-ui/src/components/Foo.vue`).
- **Styling is centralized in `@repo/tailwind-config`.** Edit mixins for cross-site changes; edit a `*-theme.scss` for single-family changes. Themes are open for extension, closed for modification.
- **Shared Nuxt config goes through `@repo/nuxt-core`.** App-level `nuxt.config.ts` files should stay thin and only override what is app-specific.
- **Never commit `.env` files.** They are gitignored and generated by `yarn init`.
- **Windows contributors use Git Bash**, not WSL, for the setup scripts.
