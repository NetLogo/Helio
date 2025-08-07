import MarkdownRenderer from './Renderer.js';
import type { MarkdownProjectConfig } from './schemas.js';

const confJSON: MarkdownProjectConfig = {
  defaults: {
    language: 'en',
    output: false,
    inheritFrom: [0],
    extension: 'md',
  },
  projectRoot: '../../',
  outputRoot: 'dist',
  scanRoot: 'src/markdown',
};

// @ts-ignore
const renderer = MarkdownRenderer.fromConfigObject(confJSON);
await renderer.init();
console.table({
  projectRoot: renderer.projectRoot,
  scanRoot: renderer.scanRoot,
});
