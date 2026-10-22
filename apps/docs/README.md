# NetLogo Documentation Site
This project builds targets for `docs.netlogo.org` and NetLogo Desktop.

## Documentation Generation
Refer to [Content Generation](../../docs/guides/building-markdowns.md) for details on how the documentation site content is generated.

## Scripts
Most scripts are prefixed. Scripts `docs:*` are scripts intended for CI/CD while `nuxt:*` scripts are a mirror of `*` built-in scripts from `nuxt`.

Typically, you want to run this project in dev mode via `yarn run nuxt:dev:no-autogen`. This disables the template handler from running on Autogen on every route change. You can run `yarn run nuxt:prepare` to generate the `content` directory from `autogen` before running in dev mode.

### Known Issues
> [!WARNING]
> Running `nuxt:prepare` while the dev server is running will break the dev server until it is restarted. This is expected behavior as `nuxt:prepare` modifies the `.nuxt` directory.

> [!WARNING]
> The handler is light and can run efficiently on route transition but it results in issues with `@nuxt/content` when run with many files.

> [!WARNING]
>  If you are getting weird issues with the dev server, try stopping it, remove the `.nuxt` directory, and re-run via `yarn run nuxt:prepare` followed by `yarn run nuxt:dev:no-autogen`.

### Bypassing Confirmation Prompts
Some scripts require confirmation before proceeding. You can bypass these prompts by using the handy [`yes`](https://en.wikipedia.org/wiki/Yes_(Unix)) command. For example:

```bash
yes | yarn run docs:deploy
```

### Overview of `docs:*` scripts
For the environment variables and options each script accepts, see [`scripts/README.md`](./scripts/README.md).

#### `docs:build`
Builds the site via `nuxt:generate` (through `scripts/generate.sh`). It will create a `.build` folder containing the following:

```
📂 (root)
├── 📂 .build
│   ├── 📁 latest                     <!-- Build with non-prefixed URL (BASE_PATH='/') -->
│   ├── 📁 <product_version>          <!-- Build with prefixed URL (BASE_PATH='/<product_version>/') -->
└── ...
```

The 📁 `latest` directory contains a build with `BASE_PATH='/'` while `<product_version>` contains a build with `BASE_PATH='<product_version>`. `latest` is only built when `BUILD_LATEST=true`.

##### Logging
The output of `stdout` and `stderr` from the build process is captured in `.stdout.log` and `.stderr.log` respectively in the project root.


Keep in mind this script may take several minutes to complete.

#### `docs:generate-manual`
Generates the NetLogo User Manual from a build. The `.build/latest` directory must exist prior to running this command or it will ask you to run `docs:build` first. The generated PDF will be placed at the top level of `.build/latest` and `.build/<product_version>`.

#### `docs:deploy`
Documented in detail in [deploying the documentation site](./DEPLOYMENT.md). In short, it handles the commit to the github repository.

#### `docs:all`
Runs `docs:clean-up`, `docs:build`, `docs:generate-manual`, and `docs:deploy` in sequence.

##### Benchmark
On M1 MacBook Air (2020):
- `docs:build`: ~4.5 minutes
- `docs:generate-manual`: ~1.5 minutes
- `docs:deploy`: ~1 minute (depends on network speed)

#### `docs:preview`
Previews the documentation site locally. If `latest` exists, it unrolls it in a `.preview` directory for previewing. Otherwise, it uses the `PRODUCT_VERSION` directory.

#### `docs:build:offline`
Creates an offline build of the site in `.build/latest`, loadable via the `file://` protocol. It runs `nuxt:generate` with `DOCS_ENV_STATIC=1`, then generates the PDF manual.

#### `docs:clean-up`
Cleans up all build and preview artifacts.

#### `docs:dev`
Alias to `nuxt:dev:no-autogen` for convenience.
