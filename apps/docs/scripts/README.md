# CI / Build Index

A quick index of the `package.json` scripts and `scripts/` files used to build, preview, and deploy the docs.

## `package.json` scripts

| Script | Runs | What it does |
| --- | --- | --- |
| `create:env` |  | Copies `.env.example` → `.env` if missing. |
| `init` | `nuxt prepare` | Creates `.env`, then prepares Nuxt. |
| `docs:build` | `scripts/generate.sh` | Static build of `/` and `/<productVersion>` for the web. |
| `docs:deploy` | `scripts/deploy.sh` | Production deploy. |
| `docs:deploy:staging` | `scripts/deploy.sh` | Deploy with `DEPLOY_MODE=staging` (no `versions.json` / latest). |
| `docs:preview` | `scripts/preview.sh` | Serve `.build/`. |
| `docs:clean-up` | `scripts/clean-up.sh` | Remove build artifacts. |
| `docs:build-and-generate-manual` | `generate-manual/build-html.sh` + `docs:generate-manual` | Build pages needed for the PDF, then generate the manual. |
| `docs:generate-manual` | `scripts/generate-manual/run.sh` | Render the PDF manual (requires a complete build). |
| `docs:build:offline` | `scripts/build-offline-site.sh` | Build the `file://` offline bundle. |
| `docs:all` | `docs:clean-up` → `docs:build` → `docs:generate-manual` → `docs:deploy` | Full clean-to-deploy pipeline. |
| `docs:dev` | `nuxt:dev:no-autogen` | Dev server, autogen disabled. |
| `nuxt:build` / `nuxt:generate` | `nuxt build` / `nuxt generate` | Nuxt build / static generate (raises heap for generate). |
| `nuxt:dev*` | `nuxt dev` | Dev servers on port 3001 (`:no-autogen`, `:watch` variants). |
| `nuxt:preview` / `nuxt:prepare` / `nuxt:postinstall` | `nuxt preview` / `nuxt prepare` | Nuxt preview / prepare wrappers. |
| `check-types` | `nuxi typecheck` | Type-check the project. |
| `lint` / `lint:fix` | `eslint` | ESLint (zero warnings) / autofix. |
| `node-version` | `node -v && npm -v` | Print node/npm versions. |
| `turbo:postinstall` | `nuxt prepare` | Prepare Nuxt for Turbo. |

## `scripts/` files

| Script | What it does |
| --- | --- |
| `generate.sh` | Static-generates the site per base path (`/` and `/<productVersion`>) into `.build/` (optionally `latest`). |
| `deploy.sh` | Builds, clones the docs repo, updates `versions.json`, copies output, commits + pushes. |
| `preview.sh` | Serves `.build/` locally on `PORT` (default 3002). |
| `clean-up.sh` | Removes `.build`, `.repo`, `.output`, `.preview`, `.build-static` and logs. |
| `build-offline-site.sh` | Builds the offline (`file://`) bundle, then the manual. |
| `update-versions.cjs` | Adds/updates the current version entry in `versions.json`. |
| `generate-manual/build-html.sh` | Builds PDF-mode HTML source for the manual. |
| `generate-manual/run.sh` | Spins up preview, renders the PDF manual + links CSV. |
| `generate-manual/index.cjs` | Puppeteer PDF renderer. |
| `generate-manual/generate-links-csv.cjs` | Extracts manual links to CSV. |
| `generate-manual/env-options.cjs` | Puppeteer launch options per environment (CI vs default). |

## Environment variables

Scripts load config from `.env` (see `.env.example`), then read a few runtime overrides on top.

### Config (`.env`)

| Variable | Default | What it does |
| --- | --- | --- |
| `PRODUCT_VERSION` | `7.0.4` | Version string used for build output paths and `versions.json`. |
| `PRODUCT_DISPLAY_NAME` | `7.0.4` | Human-readable label shown in `versions.json` and the manual. |
| `BUILD_LATEST` | `true` | Also build and publish the top-level `/` (located in `.build/latest`) alongside the versioned dir. |
| `BUILD_REPO` | `git@...:NetLogo/docs.git` | Git URL of the docs repo that `deploy.sh` pushes to. |
| `BUILD_BRANCH` | `main` | Branch that `deploy.sh` commits and pushes to. |
| `PROJECT_ROOT` / `REPO_ROOT` | `.` / `../..` | Path anchors used by the scripts. |
| `EXTENSIONS_DIR` | `$REPO_ROOT/external/extensions` | Where extension docs are sourced from. |
| `NUXT_TELEMETRY_DISABLED` | `true` | Turns off Nuxt telemetry. |
| `NUXT_PRIM_TOOLTIP_DISABLED` | `1` | Disables primitive tooltips in the generated output. |

### Runtime overrides / flags

| Variable | Set by | What it does |
| --- | --- | --- |
| `DEPLOY_MODE` | `docs:deploy:staging` & `docs:deploy:testing` | `production` (default),`staging`, or `testing`: staging skips `versions.json` and forces `BUILD_LATEST=false`; testing skips deployment. |
| `HELIO_HEADLESS` | CI / helpers | Headless mode — streams logs to console, skips interactive process-killing. |
| `CI` | CI runner | Selects hardened Puppeteer launch args in `env-options.cjs`. |
| `DOCS_ENV_STATIC` | `build-offline-site.sh` | Builds the offline (`file://`) site variant. |
| `DOCS_ENV_PDF` | `generate-manual/build-html.sh` | Builds PDF-mode HTML for the manual. |
| `NO_AUTOGEN` | `nuxt:dev:no-autogen` | Skips content autogeneration in the dev server. |
| `PORT` | `preview.sh`, manual `run.sh` | Preview / manual server port (default `3002`). |

> [!WARNING]
> Combining runtime flags in ways beyond how `package.json` and the `scripts/` files already set them may have unintended side effects. Only mix overrides that a script explicitly supports.
