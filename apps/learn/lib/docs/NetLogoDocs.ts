import type TemplateRenderer from '@repo/template';
import type { PageResult } from '@repo/template';
import fs from 'fs';
// @ts-expect-error TS7016: Could not find a declaration file for module 'glob'.
import glob from 'glob';
import path from 'path';
import process from 'process';

import { saveNavigationMetadata } from '@repo/netlogo-docs/helpers';

function copyViaGlob(globPattern: string, destDir: string) {
  const files = glob.sync(globPattern, { nodir: true });
  if (files.length === 0) {
    return;
  }

  const resolvedDestDir = path.resolve(process.cwd(), destDir);

  if (!fs.existsSync(resolvedDestDir)) {
    fs.mkdirSync(resolvedDestDir, { recursive: true });
  }

  for (const file of files) {
    const sourceFilePath = path.resolve(process.cwd(), file);
    const destFilePath = path.join(resolvedDestDir, path.basename(file));

    fs.copyFileSync(sourceFilePath, destFilePath);
  }
}

function copyLearningPathsData() {
  copyViaGlob('autogen/learning-paths/**/*.{yaml,yml}', path.join('content', 'learning-paths'));
}

function copyResourceData() {
  copyViaGlob('autogen/resources/**/*.{yaml,yml}', path.join('content', 'resources'));
}

export async function generateBetweenDirectoriesPages(
  renderer: TemplateRenderer,
  sharedBuildVariables: Record<string, unknown> = {},
): Promise<Array<PageResult>> {
  const buildResults = await renderer.build(sharedBuildVariables);
  const metadata = { title: 'NetLogo Documentation' };
  saveNavigationMetadata(metadata, renderer.paths.outputRoot);
  copyLearningPathsData();
  copyResourceData();
  return Object.values(buildResults.pages);
}
