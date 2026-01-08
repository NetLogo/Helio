import path from "node:path";
import { Turbo } from "turbo-meta-utilities";

const repoRoot = path.join("..", "..");
const turbo = new Turbo(repoRoot);
const vueUiPackage = turbo.getPackageByName("@repo/vue-ui");
if (!vueUiPackage) {
  throw new Error(
    "Fatal. Could not find @repo/vue-ui package. Check nuxt.config.ts configuration.",
  );
}
const vueUiSrc = vueUiPackage.resolvePath("src");
const vueUiStyles = vueUiPackage.resolveImport("./styles.scss")?.default;
const vueUiIconPack =
  vueUiPackage.resolveImport("./assets/icon-pack")?.default ??
  path.join(vueUiSrc, "assets", "icon-pack");

if (!vueUiStyles) {
  console.warn(
    "Could not resolve styles from @repo/vue-ui package. Check nuxt.config.ts configuration.",
  );
}

export { turbo, vueUiIconPack, vueUiSrc, vueUiStyles };
