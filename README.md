# Helio

A monorepo for NetLogo-related web applications and shared packages, built with Next.js, TypeScript, and Turborepo.

## 🏗️ Project Structure

This monorepo contains:

### Applications (`apps/`)
- **`docs`** - Documentation website (runs on port 3000)
- **`nettango`** - NetTango website (runs on port 3001)

### Packages (`packages/`)
- **`@repo/ui`** - Shared React components and styling
- **`@repo/markdown`** - NetLogo Markdown renderer
- **`@repo/mustache`** - Mustache renderer with extended feature set

- **`@repo/eslint-config`** - Shared ESLint configuration
- **`@repo/tailwind-config`** - Shared Tailwind CSS configuration
- **`@repo/typescript-config`** - Shared TypeScript configuration

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (specified in `engines`)
- Yarn 1.22.22 (specified package manager, must use for reproducability)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Helio

# Install dependencies
yarn install
```

### Development

```bash
# Start all applications in development mode
yarn dev

# Start a specific app
yarn workspace docs dev
yarn workspace nettango dev
```

### Building

```bash
# Build all applications and packages
yarn build

# Build a specific app
yarn workspace docs build
yarn workspace nettango build
```

### Other Commands

```bash
# Lint all packages
yarn lint

# Type checking
yarn check-types

# Format code
yarn format
```

## 🛠️ Tech Stack

- **Framework**: Next.js 15+ with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4+ with SCSS
- **Build Tool**: Turborepo
- **Package Manager**: Yarn Workspaces
- **Icons**: FontAwesome

## 📁 Key Features

- **Monorepo Architecture**: Efficient code sharing with Turborepo
- **Modern React**: Using React 19 with Next.js 15
- **Type Safety**: Full TypeScript support across all packages
- **Shared Components**: Reusable UI components via `@repo/ui`
- **Consistent Styling**: Shared Tailwind configuration
- **Development Tools**: ESLint, Prettier, and TypeScript checking

## 📝 Scripts

The following scripts are available at the root level:

- `yarn dev` - Start development servers for all apps
- `yarn build` - Build all apps and packages for production
- `yarn lint` - Run ESLint on all packages
- `yarn check-types` - Run TypeScript type checking
- `yarn format` - Format code with Prettier

## 📄 License

This project is private and not publicly licensed.