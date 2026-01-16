import fs from "fs/promises";
import path from "path";

import Handlebars from "handlebars";
import mustache from "mustache";

import { RenderError } from "./errors.js";
import { getFileExtension } from "./utils.js";

import { convertPath } from "@repo/utils/std/path";
abstract class TemplateEngine {
  public abstract registerPartial(key: string, content: string): void;
  public abstract render(content: string, variables: Record<string, unknown>): string;
  public abstract get engine(): unknown;

  public async registerPartialsFromDirectory(
    directory: string,
    extensions: Array<string> = ["mustache", "md"],
    rootDirectory = directory,
  ): Promise<Array<Record<string, string>>> {
    const files = await fs.readdir(directory, {
      withFileTypes: true,
      recursive: true,
    });
    const partials: Array<Record<string, string>> = [];

    for (const file of files) {
      if (!file.isFile()) continue;

      const fileExtension = getFileExtension(file.name).replace(/^\./, "");
      if (!extensions.includes(fileExtension)) continue;

      const filePath = path.join(file.parentPath, file.name);
      const fileNameRelativeToRoot = path.relative(rootDirectory, filePath);
      const fileKey: string = convertPath(fileNameRelativeToRoot, "posix");

      try {
        const content = await fs.readFile(filePath, "utf-8");
        this.registerPartial(fileKey, content);
        partials.push({ [fileKey]: content });
      } catch (error) {
        console.error(`Failed to read partial file: ${file.name}`, error);
        continue;
      }
    }
    return partials;
  }
}

class MustacheEngine extends TemplateEngine {
  private partials: Record<string, string> = {};
  public get engine(): typeof mustache {
    return mustache;
  }

  public render(content: string, variables: Record<string, unknown>): string {
    try {
      const rendered = mustache.render(content, variables, this.partials);

      if (!rendered) {
        throw new RenderError("Rendered output is empty");
      }

      return rendered;
    } catch (error: unknown) {
      throw new RenderError(`Failed to render Mustache template`, (error as Error).message);
    }
  }

  public registerPartial(key: string, content: string): void {
    this.partials[key] = content;
  }
}

class HandlebarsEngine extends TemplateEngine {
  public registerPartial(key: string, content: string): void {
    const template = Handlebars.compile(content);
    Handlebars.registerPartial(key, template);
  }

  public get engine(): typeof Handlebars {
    return Handlebars;
  }

  public render(content: string, variables: Record<string, unknown>): string {
    try {
      const template = Handlebars.compile(content);
      const rendered = template(variables);

      if (!rendered) {
        throw new RenderError("Rendered output is empty");
      }
      return rendered;
    } catch (error: unknown) {
      throw new RenderError(`Failed to render Handlebars template`, (error as Error).message);
    }
  }
}

export function createTemplateEngine(
  engine: "mustache" | "handlebars" = "mustache",
): TemplateEngine {
  switch (engine) {
    case "mustache":
      return new MustacheEngine();
    case "handlebars":
      return new HandlebarsEngine();
    default:
      console.error(`Unknown template engine: ${engine}, defaulting to Mustache.`);
      return new MustacheEngine();
  }
}

export { HandlebarsEngine, MustacheEngine };
export type { TemplateEngine };
