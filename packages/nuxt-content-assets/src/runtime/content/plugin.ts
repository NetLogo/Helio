import type { FileAfterParseHook } from "@nuxt/content";
import type { ImageSize } from "../../types";
import { makeAssetsManager } from "../assets/public";
import type { DynamicSourceManager } from "../assets/source";
import {
  buildQuery,
  buildStyle,
  isValidAsset,
  list,
  parseQuery,
  removeQuery,
  walkBody,
  walkMeta,
} from "../utils";
import { NuxtAST } from "../utils/nuxt-ast";

// eslint-disable-next-line
function createContentParser({
  imageSizes,
  publicPath,
  overrideStaticDimensions,
  dynamicSourceManager,
  mirrorTarget,
}: {
  imageSizes: ImageSize;
  publicPath: string;
  overrideStaticDimensions: boolean;
  dynamicSourceManager?: DynamicSourceManager;
  mirrorTarget?: string;
}) {
  /**
   * Assign missing props
   */
  function assignMissingProp(props: Record<string, any>, key: string, value: unknown): void {
    if (
      [undefined, null, ""].includes(props[key]) ||
      ["undefined", "null"].includes(typeof props[key]) ||
      overrideStaticDimensions
    ) {
      props[key] = value;
    }
  }

  /**
   * Walk the parsed frontmatter and check properties as paths
   */
  function processMeta(
    ctx: FileAfterParseHook,
    imageSizes: ImageSize = [],
    updated: Array<string> = [],
  ): void {
    walkMeta(
      ctx.content,
      (value: unknown, parent: Record<string, any>, key: string | number): void => {
        if (isValidAsset(value as string | number | undefined)) {
          const { srcAttr, width, height } = resolveAsset(ctx, removeQuery(value as string), true);
          if (srcAttr) {
            const query =
              width && height && (imageSizes.includes("src") || imageSizes.includes("url"))
                ? `width=${width}&height=${height}`
                : "";
            const srcUrl = query
              ? buildQuery(srcAttr, parseQuery(value as string), query)
              : srcAttr;
            parent[key] = srcUrl;
            updated.push(`meta: ${key} to "${srcUrl}"`);
          }
        }
      },
    );
  }

  /**
   * Walk the parsed content and check potential attributes as paths
   */
  async function processBody(
    ctx: NuxtAST.AfterParseHook,
    imageSizes: ImageSize = [],
    updated: Array<string> = [],
  ): Promise<void> {
    if (!NuxtAST.isMinimarkBody(ctx.content.body)) {
      console.warn(
        `No AST found or AST is not minimark format in content body of /${ctx.file.path}`,
      );
      return;
    }

    const ast = ctx.content.body.value;
    await walkBody(ast, function (node: NuxtAST.Node): void {
      if (!NuxtAST.hasProps(node)) {
        return;
      }

      const [tag, props] = node;
      for (const [prop, value] of Object.entries(props)) {
        if (typeof value !== "string") {
          continue;
        }

        if (["src", "href"].includes(prop) === false) {
          continue;
        }

        if (!isValidAsset(value)) {
          continue;
        }

        const { srcAttr, width, height } = resolveAsset(ctx, value, true);

        if (srcAttr) {
          props[prop] = srcAttr;

          if (tag === "img" || tag === "nuxt-img") {
            if (width && height) {
              if (imageSizes.includes("attrs")) {
                assignMissingProp(props, "width", width);
                assignMissingProp(props, "height", height);
              }
              if (imageSizes.includes("style")) {
                const ratio = `${width}/${height}`;
                if (typeof props.style === "string") {
                  props.style = buildStyle(props.style, `aspect-ratio: ${ratio}`);
                } else {
                  props.style ||= {};
                  props.style.aspectRatio = ratio;
                }
              }
            }
          } else if (tag === "a") {
            props.target ||= "_blank";
          }

          updated.push(`page: ${tag}[${prop}] to "${srcAttr}"`);
        }
      }

      node[1] = props;
    });
  }

  const { resolveAsset, dispose } = makeAssetsManager(
    publicPath,
    import.meta.dev,
    dynamicSourceManager,
    mirrorTarget,
  );

  const parsableExtensions = new Set<string | undefined>([
    ".md",
    ".mdx",
    ".markdown",
    ".yml",
    ".yaml",
  ]);

  return [
    async (ctx: FileAfterParseHook): Promise<void> => {
      if (parsableExtensions.has(ctx.file.extension)) {
        const updated: Array<string> = [];
        processMeta(ctx, imageSizes, updated);
        await processBody(ctx, imageSizes, updated);
        if (updated.length) {
          list(`Processed "${ctx.file.path}"`, updated);
          console.log();
        }
      }
    },
    dispose,
  ] as const;
}

export default createContentParser;
