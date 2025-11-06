import fs from "fs";
import path from "path";
import { ExportTarget, PackageJson } from "./package-json.js";

class Turbo {
  private readonly monorepoRoot: string;
  constructor(monorepoRoot: string) {
    if (!fs.existsSync(monorepoRoot)) {
      throw new Error(`Monorepo root does not exist: ${monorepoRoot}`);
    }

    if (!fs.statSync(monorepoRoot).isDirectory()) {
      throw new Error(`Monorepo root is not a directory: ${monorepoRoot}`);
    }

    const turboConfigPath = `${monorepoRoot}/turbo.json`;
    if (!fs.existsSync(turboConfigPath)) {
      throw new Error(`turbo.json not found in monorepo root: ${turboConfigPath}`);
    }

    this.monorepoRoot = path.resolve(monorepoRoot);
  }

  get packagesPath(): string {
    return `${this.monorepoRoot}/packages`;
  }

  get packages() {
    const packagesDir = this.packagesPath;
    const packageNames = fs.readdirSync(packagesDir).filter((dirName) => {
      const packagePath = path.join(packagesDir, dirName);
      return (
        fs.statSync(packagePath).isDirectory() &&
        fs.existsSync(path.join(packagePath, "package.json"))
      );
    });

    return packageNames.map((dirName) => {
      const packagePath = path.join(packagesDir, dirName);
      return new TurboPackage(packagePath);
    });
  }

  getPackageByName(packageName: string): TurboPackage | undefined {
    return this.packages.find((p) => p.name === packageName);
  }
}

class TurboPackage {
  public readonly name: string;
  public readonly path: string;

  public readonly json: PackageJson;

  constructor(_path: string) {
    this.path = path.resolve(_path);

    if (!fs.existsSync(this.path)) {
      throw new Error(`Package path does not exist: ${this.path}`);
    }

    if (!fs.statSync(this.path).isDirectory()) {
      throw new Error(`Package path is not a directory: ${this.path}`);
    }

    if (!fs.existsSync(path.join(this.path, "package.json"))) {
      throw new Error(`package.json not found in package path: ${this.path}`);
    }

    this.json = new PackageJson(path.join(this.path, "package.json"));
    this.name = this.json.name;
  }

  resolveImport(importPath: string): ExportTarget | undefined {
    const exportTarget = this.json.resolveImport(importPath);
    if (!exportTarget) return undefined;

    return new Proxy(exportTarget, {
      get: (target, prop) => {
        if (prop in target) {
          return path.join(this.path, (target as any)[prop]);
        }
        return undefined;
      },
    });
  }

  resolvePath(relativePath: string): string {
    return path.join(this.path, relativePath);
  }
}

export { Turbo, TurboPackage };
