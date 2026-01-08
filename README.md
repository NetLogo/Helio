# Helio Documentation

<p align="center">

<img src="./docs/assets/brand/1x/logo_dark.png" alt="Helio Logo" width="480" height="147" style="max-width: 384px; object-fit: contain;" />

</p>

**Helio** is a monorepo for NetLogo-related website, web  applications and shared packages, maintained by the Center for Connected Learning (CCL) at Northwestern University. This project represents the modern web ecosystem for NetLogo documentation, tools, and educational resources.

For development guides, contribution instructions, and more, please refer to the [guides section](./docs/guides/index.md).

### Architecture

**Monorepo Structure** - Turborepo-managed workspace with:
- **Applications**: Nuxt v4 and Vue 3.5
- **Packages**: Shared components, utilities, and build tools
- **External**: NetLogo extension documentation system

### Directory Structure

```
📂 Helio/
├── 📂 apps/
│   ├── 📁 docs/                    # Nuxt.js v4 documentation website
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
│   ├── 📁 nuxt-core/               # Template for Nuxt sites including common modules and plugins
│   ├── 📁 tailwind-config/         # Shared Tailwind CSS 4+ configuration
│   ├── 📁 typescript-config/       # Shared TypeScript configurations
│   └── 📁 eslint-config/           # Shared ESLint configurations
├── 📂 external/
│   └── extensions/                 # NetLogo extension documentation
└── 📂 static/                      # Static assets and favicons
```

### Getting Started
1. **Install Requirements**
   - [Node.js v22](https://nodejs.org/en/download/)
   - [Yarn v1](https://classic.yarnpkg.com/lang/en/docs/install/)
   - [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) (for Windows users)

2. **Clone the Repository**

```bash
git clone https://github.com/NetLogo/Helio.git
cd Helio
```

3. **Run the initialization script**
```bash
yarn run init
```
