# Building Markdowns

1. [Content Generation](#content-generation)
   1. [Format expected by Handlebars](#format-expected-by-handlebars)
      1. [Project configuration](#project-configuration)
      2. [The YAML Frontmatter](#the-yaml-frontmatter)
         1. [File Structure](#file-structure)
         2. [Example Frontmatter (`getting-started.yaml`)](#example-frontmatter-getting-startedyaml)
         3. [Frontmatter resolution](#frontmatter-resolution)
      3. [Features](#features)
         1. [Defining Helpers](#defining-helpers)
         2. [Partials](#partials)
         3. [Localization](#localization)
         4. [Build Variables and Data Files](#build-variables-and-data-files)
   2. [Format expected by `@nuxt/content`](#format-expected-by-nuxtcontent)
      1. [Notes on Content Assets](#notes-on-content-assets)

## Content Generation
The content is built in two parts:

1. [Handlebars](https://handlebarsjs.com/) templates, partials, and metadata artifacts live in `autogen/`. The `@repo/netlogo-docs` hosts shared code of this part. The rest is configured in `lib/docs`. This generates the `content/` directory consumed by `@nuxt/content`.
    - Configured in `lib/docs/autogen.config.ts`.
    - Documented in [the Template Package](../../packages/template/src/schemas.ts) under `ProjectConfigSchema`.
2. [Nuxt Content](https://content.nuxtjs.org/) processes the generated `content/` directory to build the final static site via Nuxt. In this step, we use `@repo/markdown` for shared and custom markdown plugins and components. They are also configured in `lib/docs`.
    - Configured in `content.config.ts`.
    - Documented in [the official Nuxt Content documentation](https://content.nuxtjs.org/docs/getting-started).

### Format expected by Handlebars
Handlebars expects frontmatter blocks in YAML format in `autogen/` (configurable in `autogen.config.ts`).

#### Project configuration
The project configuration is defined in `lib/docs/autogen.config.ts`. This file defines how the autogen process works, including:
- Where to find the source files (`autogen/` by default).
- Where to output the generated content (`content/` by default).
- Default values for various fields.
- How to output metadata (in-file frontmatter vs. separate files, JSON vs. YAML, delimiters, etc).
- Localization settings (where to output localized files, default language, etc).
- Whether to skip write operations if no changes are detected.

You can refer to the `ProjectConfigSchema` in [the Template Package](../../packages/template/src/schemas.ts) for detailed documentation of all configuration options.

#### The YAML Frontmatter
The YAML frontmatter is used to define a page generation task. A YAML file may contain multiple frontmatter blocks, each defining a separate page generation task or used to inherit common metadata for multiple tasks.

The YAML Frontmatter fields are documented in [the Template Package](../../packages/template/src/schemas.ts) under `PageDeclarationSchemaFields`. Note that sites are allowed to extend this schema with custom fields as per their needs.

The frontmatter may define the following key fields:
- `output`: Defines the output file name or whether to output a file at all.
- `extension`: Defines the file extension of the scanned files (e.g. `.md`, `.html`).
- `language`: Defines the language of the output file for localization.
- `inheritFrom`: Defines which previous frontmatter blocks in the same file to inherit from (indexed at 0).
- `buildVariables`: Defines relative paths to data files to be loaded and made available as variables in the template. This includes other YAMLs, JSON, XML, INI, and NLOGOX files.

Each YAML frontmatter block with `output: true` will scan for a file with the name `<YAML file name>[.<language> if not the default].<extension>]` (e.g. `getting-started.md`, `getting-started.es.md`) and process it via Handlebars to generate the output file.

##### File Structure
An example file structure:
```
📁 <YOUR APP>
├── 📁 lib/                               # !!This part is not strictly-enforced!!
│   └── 📁 docs/
│       ├── 📄 autogen.config.ts          # Autogen project configuration
│       ├── 📄 runDocsAutogen.ts          # Script to run the autogen process
│       └── 📁 schema.ts                  # Schema for the output metadata
├── 📁 autogen/                           # Source files for autogen
│       ├── 📄 getting-started.md         # Markdown file to be processed
│       ├── 📄 getting-started.es.md      # Localized markdown file to be processed
│       └── 📄 getting-started.yaml       # Metadata for the markdown file
├── 📁 content/                           # Generated content consumed by @nuxt/content
│       ├── 📄 getting-started.md         # Generated markdown file
│       └── 📄 getting-started.es.md      # Generated localized markdown file
└── 📄 content.config.ts                  # Nuxt Content Configuration
```

##### Example Frontmatter (`getting-started.yaml`)
```yaml
# Inherited block (defined in autogen.config.ts)
tags:                                 # Custom field
  - What is NetLogo
  - Introduction
  - Overview
icon: i-lucide-circle-question-mark   # Custom field
---
output: True                          # Output file will be getting-started.md
# Metadata
title: What is NetLogo?
description:
  Introduction to NetLogo, explaining what it is, its purpose, and how it can be
  used for agent-based modeling and simulation.
keywords:
  - What is NetLogo
  - Introduction
  - Overview
  - Agent-based Modeling
  - NetLogo
---
output: getting-started.es.md         # Output file will be getting-started.es.md
language: es                          # Spanish language
# Metadata
title: ¿Qué es NetLogo?
description:
  Introducción a NetLogo, explicando qué es, su propósito y cómo se puede usar
  para el modelado y la simulación basados en agentes.
keywords:
  - Qué es NetLogo
  - Introducción
```

##### Frontmatter resolution
There are two important concepts to understand when working with frontmatter:
1. **Inheritance**: A frontmatter block may inherit fields from previous blocks in the same file via the `inheritFrom` field. This is useful for defining common metadata for multiple files, such as multiple languages of the same page. This field could be set globally via `defaults` in your autogen config. You may also inherit from multiple previous blocks by specifying an array of indices (e.g. `inheritFrom: [0, 1]` to inherit from the first and second blocks). Inherited fields can be overridden by defining them again in the current block.
2. **Defaults**: The autogen config may define default values for any field via the `defaults` field. These defaults are applied to all frontmatter blocks unless overridden in the block itself.

#### Features
##### Defining Helpers
You may define new helpers in `lib/docs/runDocsAutogen.ts`. If you search for `.registerHelper`, you will find existing helpers as examples.

##### Partials
All files in `lib/docs` are partials. You can configure this in `lib/docs/autogen.config.ts`. You can use any partial via the `{{> /path/to/partial/in/autogen }}` syntax. It is your responsibility to ensure no circular dependencies exist.

##### Localization
You may defined localized versions of a file by defining a `language` field (e.g. `language: es`) in your frontmatter. The output file will use the naming strategy defined in your autogen config `local.toSlug` field. If not defined, it defaults to creating a top-level subdirectory with the language code (e.g. `es/filename.md`). By default, `en` is the default language and does not get a subdirectory. You may override defaults in `defaults` field in your autogen config.

##### Build Variables and Data Files
All values defined in your frontmatter are available as variables in your template. In addition to meta fields, the `buildVariables` field allows you to define relative paths. You may define data files in `autogen/data/`. The best example of this is `autogen/dictionary.md`. Supported formats are JSON, YAML, NLOGOX, INI, and XML.

### Format expected by `@nuxt/content`
The format expected by `@nuxt/content` is markdown files with frontmatter metadata. The frontmatter is written in YAML format and is delimited by `---` at the start and end of the metadata block. The metadata schema is defined in `lib/docs/schema.ts` and passed to `@nuxt/content` via `content.config.ts`. This schema is strictly enforced during content generation.

#### Notes on Content Assets
Any images or other assets referenced in the documentation can exist in one of two places:
1. Under `autogen/`: These assets will be copied to `public/_content` during the build step. You do not need to explicitly reference `_content` in your markdown. For example, an image at `autogen/images/example.png` can be referenced in markdown as `![alt text](images/example.png)`.
  - Do NOT include a leading slash when referencing these assets; use `images/example.png` instead of `/images/example.png`. Leading slashes are reserved for `public/` assets rather than `public/_content/` assets.
  - Further, if you are using the WikiLink syntax `![[...]]` you do not need to specify the `images/` prefix; just use `![[example.png]]`.
2. Under `public/`: These assets will be served as-is. You must use a leading slash when referencing these assets. For example, an image at `public/images/example.png` must be referenced in markdown as `![alt text](/images/example.png)`. You cannot use the WikiLink syntax for these assets.

Any DOM element with `src` or `href` attributes pointing to relative paths will be processed internally to resolve to the correct location based on the above rules. Similarly, any metadata field that is a URL (e.g. `meta.thumbnail`) will also be processed to resolve to the correct location. Note that CSS `url(...)` references are not processed and must be manually specified to point to the correct location.
