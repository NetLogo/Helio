import Path from "crosspath";
import debounce from "debounce";
import * as Fs from "fs";
import getImageSize from "image-size";
import { hash } from "ohash";
import type { AssetConfig } from "../../types";
import { isImage, log, removeEntry, warn } from "../utils";
import { NuxtAST } from "../utils/nuxt-ast";
import { type DynamicSourceManager, makeSourceStorage } from "./source";

/**
 * Manages the public assets
 */
export function makeAssetsManager(
  publicPath: string,
  shouldWatch = true,
  dynamicSourceManager?: DynamicSourceManager,
  mirrorTarget?: string,
): {
  init: () => void;
  setAsset: (path: string) => AssetConfig;
  getAsset: (path: string) => AssetConfig | undefined;
  removeAsset: (path: string) => AssetConfig | undefined;
  resolveAsset: (
    ctx: NuxtAST.AfterParseHook,
    relAsset: string,
    registerContent?: boolean,
  ) => Partial<AssetConfig>;
  dispose: () => Promise<void>;
} {
  // ---------------------------------------------------------------------------------------------------------------------
  // storage - updates asset index file, watches for changes from other processes
  // ---------------------------------------------------------------------------------------------------------------------

  // variables
  const assetsKey: string = "assets.json";
  const assetsPath = Path.join(publicPath, "..");

  // storage
  const storage = makeSourceStorage(assetsPath);
  if (shouldWatch) {
    void storage.watch(async (event: string, key: string) => {
      if (event === "update" && key === assetsKey) {
        await load();
        if (mirrorTarget) mirror();
      }
    });
  }

  // assets
  const assets: Record<string, AssetConfig> = {};
  async function load(): Promise<void> {
    const data = await storage.getItem(assetsKey);
    // console.log('load:', data)
    Object.assign(assets, data || {});
  }

  function mirror(): void {
    if (mirrorTarget) {
      // ensure target exists
      if (!Fs.existsSync(mirrorTarget)) {
        Fs.mkdirSync(mirrorTarget, { recursive: true });
      }

      // copy everything to the mirror path
      const files = Fs.readdirSync(publicPath, {
        recursive: true,
        withFileTypes: true,
      });
      for (const file of files) {
        const srcPath = Path.join(file.parentPath, file.name);
        const trgPath = Path.join(mirrorTarget, Path.relative(publicPath, srcPath));
        if (file.isDirectory()) {
          if (!Fs.existsSync(trgPath)) {
            Fs.mkdirSync(trgPath);
          }
        } else if (file.isFile()) {
          Fs.copyFileSync(srcPath, trgPath);
        }
      }
    }
  }

  const save = debounce(function () {
    // console.log('save:', assets)
    void storage.setItem(assetsKey, assets);
  }, 50);

  // ---------------------------------------------------------------------------------------------------------------------
  // content - get
  // ---------------------------------------------------------------------------------------------------------------------
  function resolveAsset(
    ctx: NuxtAST.AfterParseHook,
    relAsset: string,
    registerContent = false,
  ): Partial<AssetConfig> {
    const assetsRoot = ctx.file.assetsRoot;
    const srcDir = assetsRoot ?? Path.dirname(ctx.file.path);
    const srcAsset = Path.join(srcDir, relAsset);
    let asset: AssetConfig | undefined = assets[srcAsset];

    if (!asset && assetsRoot && dynamicSourceManager) {
      const absPath = dynamicSourceManager.watchAsset(assetsRoot, relAsset);
      if (absPath) {
        setAsset(absPath);
        asset = getAsset(absPath);
      }
    }

    if (asset && registerContent) {
      const { id } = ctx.file;
      if (!asset.content.includes(id)) {
        asset.content.push(id);
        save();
      }
    }

    return asset || {};
  }

  // ---------------------------------------------------------------------------------------------------------------------
  // asset - get and set asset data from absolute paths (used in watching)
  // ---------------------------------------------------------------------------------------------------------------------

  /**
   * Update a cached asset by its absolute public path
   *
   * When called by build, used to register images for the first time
   * When called by watch, used to update image size, etc
   *
   * @param path Absolute path to the asset
   */
  function setAsset(path: string): AssetConfig {
    // variables
    const { srcRel, srcAttr } = getAssetPaths(publicPath, path, mirrorTarget);
    const { width, height } = getAssetSize(path);

    // add assets to config
    const oldAsset = assets[srcRel];
    const newAsset = {
      srcAttr,
      content: oldAsset?.content || [],
      width,
      height,
    };

    // update
    assets[srcRel] = newAsset;
    save();

    // return
    return newAsset;
  }

  /**
   * Get a cached asset by its absolute public path
   */
  function getAsset(path: string): AssetConfig | undefined {
    const { srcRel } = getAssetPaths(publicPath, path, mirrorTarget);
    return srcRel && assets[srcRel] ? { ...assets[srcRel] } : undefined;
  }
  /**
   * Remove a cached asset by its absolute public path
   */
  function removeAsset(path: string): AssetConfig | undefined {
    const { srcRel } = getAssetPaths(publicPath, path, mirrorTarget);
    const asset = assets[srcRel];
    if (asset) {
      delete assets[srcRel];
      save();
    }
    return asset;
  }

  /**
   * Remove public asset files
   */
  const init = (): void => {
    if (Fs.existsSync(publicPath)) {
      const names = Fs.readdirSync(publicPath);
      for (const name of names) {
        if (!/^\.git(ignore|keep)$/.test(name)) {
          removeEntry(Path.join(publicPath, name));
        }
      }
    }
  };

  // start
  void load();

  // return
  return {
    init,
    setAsset,
    getAsset,
    removeAsset,
    resolveAsset,
    dispose: async (): Promise<void> => {
      await storage.unwatch();
      await storage.dispose();
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// utils
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Hash of replacer functions
 */
export const replacers: Record<string, (src: string) => string> = {
  key: (src: string) =>
    Path.dirname(src)
      .split("/")
      .filter((e) => e)
      .shift() || "",
  path: (src: string) => Path.dirname(src),
  folder: (src: string) => Path.dirname(src).replace(/[^/]+\//, ""),
  file: (src: string) => Path.basename(src),
  name: (src: string) => Path.basename(src, Path.extname(src)),
  extname: (src: string) => Path.extname(src),
  ext: (src: string) => Path.extname(src).substring(1),
  hash: (src: string) => hash({ src }),
};

/**
 * Interpolate assets path pattern
 *
 * @param pattern   A path pattern with tokens
 * @param src       The relative path to a src asset
 * @param warn      An optional flag to warn for unknown tokens
 */
export function interpolatePattern(pattern: string, src: string, warn = false): string {
  return Path.join(
    pattern.replace(/\[\w+]/g, (match: string) => {
      const name = match.substring(1, match.length - 1);
      const fn = replacers[name];
      if (fn) {
        return fn(src);
      }
      if (warn) {
        log(`Unknown output token ${match}`, true);
      }
      return match;
    }),
  );
}

/**
 * Parse asset paths from absolute path
 *
 * @param srcDir    The absolute path to the asset's source folder
 * @param srcAbs    The absolute path to the asset itself
 */
export function getAssetPaths(
  srcDir: string,
  srcAbs: string,
  mirrorTarget?: string,
): {
  srcRel: string;
  srcAttr: string;
} {
  // relative asset path
  const srcRel = Path.relative(srcDir, srcAbs);

  // if we have a mirror target, use relative path from there
  // to ensure that public paths are consistent
  if (mirrorTarget) {
    const mirrorRel = mirrorTarget.split("public")[1] || "";
    return {
      srcRel: srcRel,
      srcAttr: mirrorRel + "/" + srcRel,
    };
  }

  // interpolated public path
  const srcAttr = "/" + srcRel;

  // return
  return {
    srcRel,
    srcAttr,
  };
}

/**
 * Get asset image sizes
 *
 * @param srcAbs    The absolute path to the asset itself
 */
export function getAssetSize(srcAbs: string): {
  width?: number;
  height?: number;
} {
  if (isImage(srcAbs)) {
    try {
      return getImageSize(srcAbs);
    } catch (err) {
      warn(`could not read image "${srcAbs}`);
    }
  }
  return {};
}
