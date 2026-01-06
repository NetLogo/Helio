import TemplateRenderer from '@repo/template';
import path from 'path';

import _config from './autogen.config';

import { appendGitMetadata, generateGitMetadata } from '@repo/netlogo-docs/git';
import { appendAssetsRootToMetadata, generateRoutesFile } from '@repo/netlogo-docs/helpers';
import { ProjectConfigSchema } from '@repo/template/schemas';
import { generateBetweenDirectoriesPages } from './NetLogoDocs';

export default async function runDocsAutogen() {
  const config = ProjectConfigSchema.parse(_config);
  const scanRoot = path.join(process.cwd(), config.scanRoot);
  const projectRoot = path.join(process.cwd(), config.projectRoot);

  const gitMetadata = await generateGitMetadata(scanRoot, projectRoot);
  config.metadata.transform = (metadata: Record<string, unknown>) => {
    return appendAssetsRootToMetadata(appendGitMetadata(metadata, gitMetadata));
  };

  const renderer = new TemplateRenderer(config);

  const buildVariables = {
    version: process.env['PRODUCT_VERSION'] || '7.0.1',
    buildDate: process.env['PRODUCT_BUILD_DATE'] || new Date().toISOString(),
  };

  const result = await Promise.all([generateBetweenDirectoriesPages(renderer, buildVariables)]);

  await generateRoutesFile(renderer, result.flat());

  if (global.gc) {
    global.gc();
  }
}
