import fs from 'fs/promises';
import path from 'path';

import Handlebars from 'handlebars';
import mustache from 'mustache';

import { RenderError } from './errors';
import { getFileExtension } from './utils';

abstract class TemplateEngine {
  abstract registerPartial(key: string, content: string): void;
  abstract render(content: string, variables: Record<string, any>): string;

  async registerPartialsFromDirectory(
    directory: string,
    extensions: string[] = ['mustache', 'md'],
    rootDirectory = directory
  ) {
    const files = await fs.readdir(directory, {
      withFileTypes: true,
      recursive: true,
    });
    const partials: Record<string, string>[] = [];

    for (const file of files) {
      if (!file.isFile()) continue;

      const fileExtension = getFileExtension(file.name).replace(/^\./, '');
      if (!extensions.includes(fileExtension)) continue;

      const filePath = path.join(file.parentPath, file.name);
      const fileNameRelativeToRoot = path.relative(rootDirectory, filePath);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        this.registerPartial(fileNameRelativeToRoot, content);
        partials.push({ [fileNameRelativeToRoot]: content });
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

  render(content: string, variables: Record<string, any>) {
    let rendered;
    try {
      rendered = mustache.render(content, variables, this.partials);

      if (!rendered) {
        throw new RenderError('Rendered output is empty');
      }
    } catch (error: any) {
      throw new RenderError(
        `Failed to render Mustache template`,
        error.message
      );
    }
    return rendered;
  }

  registerPartial(key: string, content: string) {
    this.partials[key] = content;
  }
}

class HandlebarsEngine extends TemplateEngine {
  registerPartial(key: string, content: string) {
    const template = Handlebars.compile(content);
    Handlebars.registerPartial(key, template);
  }

  render(content: string, variables: Record<string, any>) {
    let rendered;
    try {
      const template = Handlebars.compile(content);
      rendered = template(variables);

      if (!rendered) {
        throw new RenderError('Rendered output is empty');
      }
    } catch (error: any) {
      throw new RenderError(
        `Failed to render Handlebars template`,
        error.message
      );
    }
    return rendered;
  }
}
export { HandlebarsEngine, MustacheEngine };
export type { TemplateEngine };
