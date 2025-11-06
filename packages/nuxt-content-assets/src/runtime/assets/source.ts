import Path from "crosspath";
import { createStorage, type Storage, type WatchEvent } from "unstorage";
import fsDriver, { type FSStorageOptions } from "unstorage/drivers/fs";
import githubDriver, { type GithubOptions } from "unstorage/drivers/github";
import { copyFile, deKey, isAsset, isExcluded, removeFile, toPath } from "../utils";

/**
 * Helper function to determine valid ids
 */
function isAssetId(id: string) {
  const path = toPath(id);
  return !isExcluded(path) && isAsset(path);
}

/**
 * Make a Storage instance that monitors assets from a single source
 */
export function makeSourceStorage(source: string, key = ""): Storage {
  const storage = createStorage();
  const options = typeof source === "string" ? { driver: "fs", base: source } : source;
  switch (options.driver) {
    case "fs":
      storage.mount(
        key,
        fsDriver({
          ...options,
          ignore: ["[^:]+?\\.md", "_dir\\.yml"],
        } as FSStorageOptions),
      );
      break;

    case "github":
      storage.mount(
        key,
        githubDriver({
          branch: "main",
          dir: "/",
          ...options,
        } as unknown as GithubOptions),
      );
      break;
  }
  return storage;
}

export interface DynamicSourceManager {
  watchAsset: (rootPath: string, relPath: string) => string | false;
  removeAsset: (relPath: string) => string | undefined;
  getAsset: (rootPath: string, relPath: string) => string | undefined;
  dispose: () => Promise<void>;
}

export function makeDynamicSourceManager(
  publicPath: string,
  onAssetChange?: (event: WatchEvent, path: string) => void,
): DynamicSourceManager {
  // public-subdir -> Storage
  const storages: Record<string, Storage> = {};
  // normalized-relative-path -> absolute-path
  const watchedAssets: Record<string, string> = {};
  // rootPath/relPath -> publicPath/relPath
  const collisionMap: Record<string, string> = {};

  function _getTrgPath(relPath: string) {
    return Path.join(publicPath, Path.normalize(relPath));
  }

  function _getAbsPath(rootPath: string, relPath: string) {
    return Path.join(Path.normalize(rootPath), Path.normalize(relPath));
  }

  function _getRelPathFromKey(key: string) {
    return Path.normalize(toPath(deKey(key)));
  }

  function copyItem(rootPath: string, relPath: string) {
    const absSrc = _getAbsPath(rootPath, relPath);
    const absTrg = _getTrgPath(relPath);

    if (collisionMap[absSrc] && collisionMap[absSrc] !== absTrg) {
      throw new Error(
        `Asset collision detected: "${absSrc}" is already mapped to "${collisionMap[absSrc]}", cannot map to "${absTrg}"`,
      );
    }

    copyFile(absSrc, absTrg);
    watchedAssets[Path.normalize(relPath)] = absTrg;
    collisionMap[absSrc] = absTrg;
    return absTrg;
  }

  function removeItem(relPath: string) {
    const absTrg = _getTrgPath(relPath);
    removeFile(absTrg);
    delete watchedAssets[Path.normalize(relPath)];
    return absTrg;
  }

  function getAsset(relPath: string) {
    const normPath = Path.normalize(relPath);
    return watchedAssets[normPath];
  }

  function hasAsset(relPath: string) {
    const normPath = Path.normalize(relPath);
    return Object.prototype.hasOwnProperty.call(watchedAssets, normPath);
  }

  function createWatchEventListener(rootPath: string) {
    return (event: WatchEvent, key: string) => {
      const relPath = _getRelPathFromKey(key);
      if (isAssetId(key) && hasAsset(relPath)) {
        const path = event === "update" ? copyItem(rootPath, relPath) : removeItem(relPath);
        if (onAssetChange) {
          onAssetChange(event, path);
        }
      }
    };
  }

  function watchAsset(rootPath: string, relPath: string) {
    const normRoot = Path.normalize(rootPath);
    const normRel = Path.normalize(relPath);

    if (!storages[normRoot]) {
      storages[normRoot] = makeSourceStorage(normRoot);
      void storages[normRoot].watch(createWatchEventListener(normRoot));
    }

    try {
      if (!hasAsset(normRel)) {
        copyItem(normRoot, normRel);
      }
    } catch (err) {
      return false;
    }

    return _getTrgPath(normRel);
  }

  function removeAsset(relPath: string) {
    const normRel = Path.normalize(relPath);
    if (hasAsset(normRel)) {
      return removeItem(normRel);
    }
    return undefined;
  }

  async function dispose() {
    const tasks = Object.values(storages).map(async (storage) => {
      try {
        await storage.unwatch?.();
        await storage.dispose?.();
      } catch (err) {
        console.error("Failed to dispose storage:", err);
      }
    });

    await Promise.allSettled(tasks);
  }

  return {
    watchAsset,
    removeAsset,
    getAsset,
    dispose,
  };
}
