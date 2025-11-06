# NetLogo Documentation Site
This project builds targets for `docs.netlogo.org` and NetLogo Desktop.

## Documentation Generation
The documentation site is built in two parts:

1. [Handlebars](https://handlebarsjs.com/) templates, partials, and metadata artifacts live in `autogen/`. The `@repo/netlogo-docs` hosts shared code of this part. The rest is configured in `lib/docs`. This generates the `content/` directory consumed by `@nuxt/content`.
2. [Nuxt Content](https://content.nuxtjs.org/) processes the generated `content/` directory to build the final static site via Nuxt. In this step, we use `@repo/markdown` for shared and custom markdown plugins and components. They are also configured in `lib/docs`.

### Format expected by Handlebars
Handlebars will scan any file added to `autogen/` with the `.md` extension. You can change the extension for a single file via its frontmatter `extension` field. You can utilize the following features:
1. *Defining helpers*: You may define new helpers in `lib/docs/runDocsAutogen.ts`. If you search for `.registerHelper`, you will find existing helpers as examples.
2. *Using partials*: All files in `lib/docs` are partials. You can configure this in `lib/docs/autogen.config.ts`. You can use any partial via the `{{> /path/to/partial/in/autogen }}` syntax. It is your responsibility to ensure no circular dependencies exist.
3. *Metadata*: You can define metadata for each file via frontmatter. The frontmatter is written in YAML format in a file with the same name as the markdown file but with a `.yml` or `.yaml` extension. For example, for `autogen/getting-started.md`, the metadata file would be `autogen/getting-started.yml`.
    - One file may contain multiple frontmatter entries.
    - Each frontmatter entry may or may not correspond to a markdown file. You configure that via the `output` field. You may set the output field to `true` to use the same name as the markdown file, a string to specify a custom output file name, or `false`/`null` to not output a file for that entry.
    - A frontmatter entry may inherit from previous entries in the same file. This is useful for defining common metadata for multiple files, such as multiple languages of the same page. This is defined via the `inheritFrom: Array<index>` field (e.g. `inheritFrom: [0]` to inherit from the first entry in the same file).
    - Metadata can either be appended to the start of your file as frontmatter/JSON with a custom delimiter or in a separate file. See **Configuration** below for details.
4. *Locale*: You may defined localized versions of a file by defining a `language` field (e.g. `language: es`) in your frontmatter. The output file will use the naming strategy defined in your autogen config `local.toSlug` field. If not defined, it defaults to creating a top-level subdirectory with the language code (e.g. `es/filename.md`). By default, `en` is the default language and does not get a subdirectory. You may override defaults in `defaults` field in your autogen config.
5. *Build variables and data files*: All values defined in your frontmatter are available as variables in your template. In addition to meta fields, the `buildVariables` field allows you to define relative paths. You may define data files in `autogen/data/`. The best example of this is `autogen/dictionary.md`. Supported formats are JSON, YAML, NLOGOX, INI, and XML.
6. *Configuration*: You may configure the autogen process via `lib/docs/autogen.config.ts`. The config is documented in `@repo/template/schemas`.


### Format expected by `@nuxt/content`
The format expected by `@nuxt/content` is markdown files with frontmatter metadata. The frontmatter is written in YAML format and is delimited by `---` at the start and end of the metadata block. The metadata schema is defined in `lib/docs/schema.ts` and passed to `@nuxt/content` via `content.config.ts`. This schema is strictly enforced during content generation.

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
