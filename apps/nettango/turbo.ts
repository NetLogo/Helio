import path from "path";
import { Turbo } from "turbo-meta-utilities";

if (!process.env["REPO_ROOT"]) {
  console.warn("REPO_ROOT environment variable is not set. Some features may not work correctly.");
}

const repoRoot = process.env["REPO_ROOT"] ?? "../../";
const turbo = new Turbo(repoRoot);
const vueUiPackage = turbo.getPackageByName("@repo/vue-ui");
if (!vueUiPackage) {
  throw new Error(
    "Fatal. Could not find @repo/vue-ui package. Check nuxt.config.ts configuration.",
  );
}
const vueUiSrc = vueUiPackage.resolvePath("src");
const vueUiStyles = vueUiPackage.resolveImport("./styles.scss")?.default;
const vueUIAssets = path.join(vueUiPackage.path, "assets");

if (!vueUiStyles) {
  console.warn(
    "Could not resolve styles from @repo/vue-ui package. Check nuxt.config.ts configuration.",
  );
}

export { turbo, vueUIAssets, vueUiSrc, vueUiStyles };
