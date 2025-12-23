## Managing Dependencies
Managing dependencies might be the most tricky part of Helio development. Helio uses a monorepo structure managed with [yarn workspaces](https://classic.yarnpkg.com/en/docs/workspaces/), [yarn](https://yarnpkg.com/) and [turborepo](https://turbo.build/repo).

### Checking mismatched dependency versions
To check for mismatched dependency versions across the monorepo, you can use the following command
```bash
npx syncpack list-mismatches
```

You want to make sure that dependency versions are *globally*-consistent. For example, if two packages depend on `typescript`, they should both depend on the same version of `typescript`. If you find mismatched versions, you can use the following command to fix them:
```bash
npx syncpack fix-mismatches
```

This will update all packages to use the same version of each dependency. By default, it will use the highest version found among the mismatched versions. You can also specify a specific version to use with the `--version` flag.

### Checking dependency tree
To check the dependency tree of a specific package, you can use the following command:
```bash
yarn list --pattern <package-name> --recursive
```
Replace `<package-name>` with the name of the package you want to check. This will show you all the packages that depend on the specified package, along with their versions.

### Upgrading a dependency
To upgrade a dependency across the monorepo:

1. Identify the version you want to upgrade to via [NPM registery](https://www.npmjs.com/) or the packages's GitHub repository.
2. Read the changelogs for breaking changes and dependency updates.
3. Run the following command to upgrade the dependency across all packages:
```bash
npx syncpack update-package <package-name>@<new-version>
```
Replace `<package-name>` with the name of the package you want to upgrade, and `<new-version>` with the version you want to upgrade to.
4. If you run into issues, revert your changes (via Git followed by `yarn install --force`) and try upgrading the dependency in smaller steps (e.g., upgrading to an intermediate version first).

### Forcing consistent resolution
If you want to force a specific version of a dependency across the entire monorepo, you can use the `resolutions` field in the root `package.json` file. For example:
```json
"resolutions": {
  "typescript": "5.4.0"
}
```

> :warning: If a package has a peer dependency on a different version of the same package, you may run into issues. Use this feature with caution and make sure to test your packages thoroughly after making changes.

> :warning: If a package is actually multiple packages (e.g. `@vue/core` and `@vue/shared`), forcing resolution on only one of the packages might cause version mismatches. Make sure to force resolution on all related packages if necessary.

### Sanity checks after updating dependencies
After updating dependencies, make sure to run the following commands to ensure everything is working correctly:

[ ] Run `yarn run build` and ensure it completes without errors.

[ ] Run `yarn run test` and ensure all tests pass.

[ ] Run `yarn run lint` and ensure there are no linting errors.

[ ] Manually test applications boot up in development and production modes.

[ ] Manually test JavaScript loads in applications without errors.

## Important dependency choices

### Vue
Dependency versions must match across the following Vue packages:

```json
"vue": "<version>",
"@vue/runtime-core": "<version>",
"@vue/server-renderer": "<version>",
"@vue/compiler-sfc": "<version>",
"@vue/reactivity": "<version>",
"@vue/shared": "<version>"
```

Vue must also use a frozen version of `reka-ui`, `@nuxt/ui` and `@vueuse/core` to ensure compatibility. You must make sure `reka-ui` and `@nuxt/ui` versions are compatible with the Vue version in use and with each other.

### TypeScript ESLint
Dependency versions must match across the following TypeScript ESLint packages:
```json
"@typescript-eslint/eslint-plugin": "<version>",
"@typescript-eslint/parser": "<version>",
"@typescript-eslint/types": "<version>",
"@typescript-eslint/utils": "<version>",
"typescript-eslint": "<version>"
```

### Nuxt
Nuxt is currently frozen. Upgrading Nuxt requires careful consideration in the following order:
1. Upgrading Nuxt itself
2. Upgrading Nuxt modules
3. Upgrading frozen dependencies used by Nuxt modules (e.g., `reka-ui`, `@nuxt/ui`, `@vueuse/core`, etc.)
4. Upgrading Vue and its related packages

## Shadow bugs
Weird unexplainable `vite`, `vue`, `typescript` or `eslint` bugs can sometimes are almost always caused by mismatched dependency versions. If you run into weird issues, make sure to check for mismatched versions first.
