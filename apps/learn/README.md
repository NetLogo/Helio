# NetLogo Learn Guide Site
This project builds targets for `learn.netlogo.org` and NetLogo Desktop.

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

### Notes on Content Assets
Any images or other assets referenced in the documentation can exist in one of two places:
1. Under `autogen/`: These assets will be copied to `public/_content` during the build step. You do not need to explicitly reference `_content` in your markdown. For example, an image at `autogen/images/example.png` can be referenced in markdown as `![alt text](images/example.png)`.
    - Do NOT include a leading slash when referencing these assets; use `images/example.png` instead of `/images/example.png`. Leading slashes are reserved for `public/` assets rather than `public/_content/` assets.
    - Further, if you are using the WikiLink syntax `![[...]]` you do not need to specify the `images/` prefix; just use `![[example.png]]`.
2. Under `public/`: These assets will be served as-is. You must use a leading slash when referencing these assets. For example, an image at `public/images/example.png` must be referenced in markdown as `![alt text](/images/example.png)`. You cannot use the WikiLink syntax for these assets.

Any DOM element with `src` or `href` attributes pointing to relative paths will be processed internally to resolve to the correct location based on the above rules. Similarly, any metadata field that is a URL (e.g. `meta.thumbnail`) will also be processed to resolve to the correct location. Note that CSS `url(...)` references are not processed and must be manually specified to point to the correct location.
