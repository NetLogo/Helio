# Helio Documentation

<p align="center">

<img src="./docs/assets/brand/1x/logo_dark.png" alt="Helio Logo" width="480" height="147" style="max-width: 384px; object-fit: contain;" />

</p>

**Helio** is a monorepo for NetLogo-related website, web  applications and shared packages, maintained by the Center for Connected Learning (CCL) at Northwestern University. This project represents the modern web ecosystem for NetLogo documentation, tools, and educational resources.

### Architecture

**Monorepo Structure** - Turborepo-managed workspace with:
- **Applications**: Nuxt v4 and Vue 3.5
- **Packages**: Shared components, utilities, and build tools
- **External**: NetLogo extension documentation system

### Directory Structure

```
Helio/
├── apps/
│   ├── docs/                    # Nuxt.js v4 documentation website
├── packages/
│   ├── vue-ui/                  # Vue component library with Reka UI in Nuxt
│   ├── markdown/                # NetLogo markdown renderer
│   ├── template/                # Mustache/Handlebars template engine
│   ├── netlogo-docs/            # NetLogo documentation shared generators
│   ├── utils/                   # Shared utilities
│   ├── nuxt-content-assets/     # Nuxt content asset management
│   ├── tailwind-config/         # Shared Tailwind CSS 4+ configuration
│   ├── typescript-config/       # Shared TypeScript configurations
│   └── eslint-config/           # Shared ESLint configurations
├── external/
│   └── extensions/              # NetLogo extension documentation
└── static/                      # Static assets and favicons
```

### Getting Started
1. **Clone the Repository**

```bash
git clone https://github.com/NetLogo/Helio.git
cd Helio
```

2. **Install Dependencies**
```bash
yarn install --frozen-lockfile
```
3. **Build the packages**
```bash
source scripts/build-packages.sh
```

or build all with turborepo:
```bash
yarn turbo run build
```

or build them manually (must start with `@repo/utils`).

4. **Install dependencies and run an app**
```bash
cd apps/<some-app>
yarn install
yarn ...
```
