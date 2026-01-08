# NetLogo Documentation Site
This project builds targets for `docs.netlogo.org` and NetLogo Desktop.

## Documentation Generation
Refer to [Content Generation](../../docs/guides/building-markdowns.md) for details on how the documentation site content is generated.

## Scripts
Most scripts are prefixed. Scripts `docs:*` are scripts intended for CI/CD while `nuxt:*` scripts are a mirror of `*` built-in scripts from `nuxt`.

Typically, you want to run this project in dev mode via `yarn run nuxt:dev:no-autogen`. This disables the template handler from running on Autogen on every route change. You can run `yarn run nuxt:prepare` to generate the `content` directory from `autogen` before running in dev mode.

### Known Issues
> :warning: Running `nuxt:prepare` while the dev server is running will break the dev server until it is restarted. This is expected behavior as `nuxt:prepare` modifies the `.nuxt` directory.

> :warning: The handler is light and can run efficiently on route transition but it results in issues with `@nuxt/content` when run with many files.

> :warning: If you are getting weird issues with the dev server, try stopping it, remove the `.nuxt` directory, and re-run via `yarn run nuxt:prepare` followed by `yarn run nuxt:dev:no-autogen`.

### Bypassing Confirmation Prompts
Some scripts require confirmation before proceeding. You can bypass these prompts by using the handy [`yes`](https://en.wikipedia.org/wiki/Yes_(Unix)) command. For example:

```bash
yes | yarn run docs:deploy
```

### Overview of `docs:*` scripts
#### `docs:build`
Builds the site via `nuxt:build`. It will create a `.build` folder containing the following:

```
📂 (root)
├── 📂 .build
│   ├── 📁 <product_version>          <!-- Version with non-prefixed URL -->
│   ├── 📁 <product_version>          <!-- Version with prefixed URL -->
└── ...
```

The 📁 `latest` directory contains a build with `BASE_PATH='/'` while `<product_version>` contains a build with `BASE_PATH='<product_version>`.

##### Logging
The output of `stdout` and `stderr` from the build process is captured in `.stdout.log` and `.stderr.log` respectively in the project root.

##### Known Issues
This script is known to get stuck sometimes due to Nuxt's build process, particularly, when run in the VSCode terminal on macOS. If this happens, try running the command in a different terminal (e.g., iTerm2, Terminal.app) or simply re-running the command. You will know the build is stuck if you find this message in `.stdout.log` at the end of the file with no further output after it for more than a few seconds:

```
[nuxi] ✔ You can now deploy .output/public to any static hosting!
```

Keep in mind this script may take several minutes to complete.

##### Options
- (via environment) `BUILD_LATEST`: builds the `.build/latest` directory.
- (via environment) `PRODUCT_VERSION`: sets the product version for the build.

#### `docs:generate-manual`
Generates the NetLogo User Manual from a build. The `.build/latest` directory must exist prior to running this command or it will ask you to run `docs:build` first. The generated PDF will be placed at the top level of `.build/latest` and `.build/<product_version>`.

##### Options
- (via environment) `PRODUCT_VERSION`: sets the product version for the build, visible in the title page of the generated PDF.
- (via environment) `PORT`: sets the port for the preview server. Default: `3002`.

#### `docs:deploy`
Documented in detail in [deploying the documentation site](./DEPLOYMENT.md). In short, it handles the commit to the github repository.

##### Options
- (via environment) `PROJECT_ROOT`: sets the project root for the build (usually: `.`).
- (via environment) `PRODUCT_DISPLAY_NAME`: sets the product display name for the build.
- (via environment) `PRODUCT_VERSION`: sets the product version for the build.
- (via environment) `BUILD_REPO`: sets the repository to push the built documentation to.
- (via environment) `BUILD_BRANCH`: sets the branch to push the built documentation to.

#### `docs:all`
Runs `docs:build`, `docs:generate-manual`, and `docs:deploy` in sequence.

##### Benchmark
On M1 MacBook Air (2020):
- `docs:build`: ~4.5 minutes
- `docs:generate-manual`: ~1.5 minutes
- `docs:deploy`: ~1 minute (depends on network speed)

#### `docs:preview`
Previews the documentation site locally. If `latest` exists, it unrolls it in a `.preview` directory for previewing. Otherwise, it uses the `PRODUCT_VERSION` directory.

#### `docs:make-static-site`
Creates a static export of the documentation site in `.build-static`. Static here refers to a site that can be loaded via the `file://` protocol. It uses relative paths and inlining for all assets. This exports only a subset of directories: the home page and top-level manual pages. It does not support javascript.

#### `docs:clean-up`
Cleans up all build and preview artifacts.

#### `docs:dev`
Alias to `nuxt:dev:no-autogen` for convenience.
