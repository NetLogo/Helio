import { addPlugin, createResolver, defineNuxtModule } from "@nuxt/kit";
import type { ModuleMeta, Nuxt } from "@nuxt/schema";
import Path from "crosspath";
import * as Fs from "fs";
import { setupSocketServer } from "./build/sockets/setup";
import { makeAssetsManager } from "./runtime/assets/public";
import { makeDynamicSourceManager } from "./runtime/assets/source";
import createContentParser from "./runtime/content/plugin";
import { log, makeIgnores, matchTokens, removeEntry, warn } from "./runtime/utils";
import type { ImageSize, ModuleOptions } from "./types";

// @ts-expect-error - virtual module
const resolve = createResolver(import.meta.url).resolve;

const meta: ModuleMeta = {
  name: "nuxt-content-assets",
  configKey: "contentAssets",
  compatibility: {
    nuxt: ">=4.0.0",
  },
};

export default defineNuxtModule<ModuleOptions>({
  meta,

  defaults: {
    imageSize: "",
    contentExtensions: "mdx? csv ya?ml json",
    debug: false,
    overrideStaticDimensions: false,
  },

  async setup(options: ModuleOptions, nuxt: Nuxt) {
    // ---------------------------------------------------------------------------------------------------------------------
    // paths
    // ---------------------------------------------------------------------------------------------------------------------

    // nuxt build folder (.nuxt)
    const buildPath = nuxt.options.buildDir;

    // node modules folder (note: from v1.4.1 the assets cache moved from .nuxt/... to node_modules/... @see #76)
    const modulesPath =
      nuxt.options.modulesDir.find((path: string) =>
        Fs.existsSync(`${path}/nuxt-content-assets/cache`),
      ) || "";
    if (!modulesPath) {
      warn("Unable to find cache folder!");
      if (nuxt.options.rootDir.endsWith("/playground")) {
        warn('Run "npm run dev:setup" to generate a new cache folder');
      }
    }

    // assets cache (node_modules/nuxt-content-assets/cache)
    const cachePath = modulesPath
      ? Path.resolve(modulesPath, "nuxt-content-assets/cache")
      : Path.resolve(buildPath, "content-assets");

    // public folder (node_modules/nuxt-content-assets/cache/public)
    const publicPath = Path.join(cachePath, "public");

    // content cache (.nuxt/content-cache)
    const contentPath = Path.join(buildPath, "content-cache");

    // ---------------------------------------------------------------------------------------------------------------------
    // setup
    // ---------------------------------------------------------------------------------------------------------------------

    // options
    const isDev = !!nuxt.options.dev;
    const isDebug = !!options.debug;

    // clear caches
    if (isDebug) {
      log("Cleaning content-cache");
      log(`Cache path: "${Path.relative(".", cachePath)}"`);
    }

    // clear cached markdown so image paths get updated
    removeEntry(contentPath);

    // ---------------------------------------------------------------------------------------------------------------------
    // options
    // ---------------------------------------------------------------------------------------------------------------------

    // set up content ignores
    const { contentExtensions } = options;
    if (contentExtensions) {
      // @ts-ignore -- @nuxt/content is available in peer
      nuxt.options.content ||= {};
      // @ts-ignore -- @nuxt/content is available in peer
      nuxt.options.content.ignores ||= [];
      const ignores = makeIgnores(contentExtensions);
      // @ts-ignore -- @nuxt/content is available in peer
      nuxt.options.content?.ignores.push(ignores);
    }

    // convert image size hints to array
    const imageSizes: ImageSize = matchTokens(options.imageSize) as ImageSize;
    const overrideStaticDimensions = options.overrideStaticDimensions ?? true;

    // ---------------------------------------------------------------------------------------------------------------------
    // assets
    // ---------------------------------------------------------------------------------------------------------------------

    /**
     * Assets manager
     */

    const mirrorTarget = Path.join(nuxt.options.rootDir, "public", "_content");
    Fs.mkdirSync(mirrorTarget, { recursive: true });
    const dynamicSourceManager = makeDynamicSourceManager(publicPath, onAssetChange);
    const assets = makeAssetsManager(publicPath, isDev, dynamicSourceManager, mirrorTarget);

    // clear files from previous run
    assets.init();

    /**
     * Callback for when assets change
     *
     * - if the asset is updated or deleted, we tell the browser to update the asset's properties
     * - if the asset is an image and changes size, we also rewrite the cached content
     *
     * @param event   The type of update
     * @param absTrg  The absolute path to the copied asset
     */
    function onAssetChange(event: "update" | "remove", absTrg: string) {
      let src: string = "";
      let width: number | undefined;
      let height: number | undefined;

      // update
      if (event === "update") {
        const newAsset = assets.setAsset(absTrg);

        width = newAsset.width;
        height = newAsset.height;

        src = newAsset.srcAttr;
      } else {
        const asset = assets.removeAsset(absTrg);
        if (asset) {
          src = asset.srcAttr;
        }
      }

      if (src && socket) {
        socket.send({ event, src, width, height });
      }
    }

    /**
     * Socket to communicate changes to client
     */
    addPlugin(resolve("./runtime/sockets/plugin"));
    const socket =
      // @ts-ignore -- @nuxt/content is available in peer
      isDev && nuxt.options.content?.watch.enabled !== false
        ? await setupSocketServer("content-assets")
        : null;

    // ---------------------------------------------------------------------------------------------------------------------
    // nuxt hooks
    // ---------------------------------------------------------------------------------------------------------------------
    // cleanup when nuxt closes
    nuxt.hook("close", async () => {
      await assets.dispose();
    });

    // ---------------------------------------------------------------------------------------------------------------------
    // nitro hook
    // ---------------------------------------------------------------------------------------------------------------------

    // plugin
    const [parser, dispose] = createContentParser({
      publicPath,
      imageSizes,
      overrideStaticDimensions,
      dynamicSourceManager,
      mirrorTarget,
    });

    nuxt.hook("content:file:afterParse", async (ctx) => {
      await parser(ctx);
    });

    nuxt.hook("close", async () => {
      await dispose();
    });
  },
});
