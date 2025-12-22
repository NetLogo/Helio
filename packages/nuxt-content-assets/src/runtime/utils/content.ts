import type { FileAfterParseHook } from "@nuxt/content";
import { NuxtAST } from "./nuxt-ast";
import { type WalkCallback, walk } from "./object";
import { matchTokens } from "./string";

const tags = {
  exclude: matchTokens({
    container: "pre code code-inline",
    formatting:
      "acronym abbr address bdi bdo big center cite del dfn font ins kbd mark meter progress q rp rt ruby s samp small strike sub sup time tt u var wbr",
    controls: "input textarea button select optgroup option label legend datalist output",
    media: "map area canvas svg",
    other: "style script noscript template",
    empty: "hr br",
  }),

  include: matchTokens({
    headers: "h1 h2 h3 h4 h5 h6",
    content:
      "main header footer section article aside details dialog summary data object nav blockquote div span p",
    table: "table caption th tr td thead tbody tfoot col colgroup",
    media: "figcaption figure picture",
    form: "form fieldset",
    list: "ul ol li dir dl dt dd",
    formatting: "strong b em i",
    anchor: "a",
  }),

  assets: "img audio source track video embed",
};

/**
 * Walk parsed content meta, only processing relevant properties
 *
 * @param content
 * @param callback
 */
export function walkMeta(content: FileAfterParseHook["content"], callback: WalkCallback): void {
  walk(content, callback, (value, key) => !(String(key).startsWith("_") || key === "body"));
}

/**
 * Walk parsed content body, only visiting relevant tags
 *
 * @param content
 * @param callback
 */
export function walkBody(
  body: NuxtAST.Tree,
  callback: (node: NuxtAST.Node) => void,
): Promise<Boolean> {
  return NuxtAST.walk(body, (node: NuxtAST.Node): NuxtAST.WalkOptions | void => {
    if (typeof node === "string") return NuxtAST.WalkOptions.CONTINUE;
    const [tag, props] = node;

    const excluded = tags.exclude.includes(tag);
    if (excluded) {
      return NuxtAST.WalkOptions.SKIP;
    }

    const included = tags.include.includes(tag);
    if (included || !props) {
      return NuxtAST.WalkOptions.CONTINUE;
    }

    callback(node);
  });
}
