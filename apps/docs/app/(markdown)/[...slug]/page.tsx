import fs from 'fs/promises';
import path from 'path';

import MarkdownRenderer, { PageParser } from '@repo/markdown';

export default async function Page({ params }: { params: { slug: string[] } }) {
  const { slug } = await params;
  const { html } = await getPageHTML(slug);
  return (
    <main
      className="min-h-screen prose"
      dangerouslySetInnerHTML={{ __html: html || '<p>Page not found.</p>' }}
    />
  );
}

export async function generateStaticParams() {
  const renderer = new MarkdownRenderer(
    path.join(process.cwd(), 'autogen', 'conf.json')
  );
  await renderer.run();

  // Scan the output directory for generated pages
  const outputDir = renderer.outputRoot!;
  const generatedPages = await fs.readdir(outputDir, { recursive: true });
  const generatedSlugs = generatedPages
    .filter((file) => file.endsWith('.html'))
    .map((file) => file.replace(/\.html$/, ''))
    .map((slug) => ({ slug: slug.split('/') }));

  return generatedSlugs;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string[] };
}) {
  // https://nextjs.org/docs/messages/sync-dynamic-apis
  const { slug } = await params;

  const renderer = new MarkdownRenderer(
    path.join(process.cwd(), 'autogen', 'conf.json')
  );
  await renderer.init();

  const slugPath = slug.join('/');
  const metadataPath = path.join(
    renderer.outputRoot!,
    slugPath + PageParser.METADATA_SUFFIX
  );

  try {
    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);
    return {
      title: metadata.title || 'Documentation',
      description: metadata.description || 'Documentation page',
    };
  } catch (error) {
    console.error(`Failed to read metadata for slug: ${slugPath}`, error);
    return {
      title: 'Documentation',
      description: 'Documentation page',
    };
  }
}

export async function getPageHTML(slug: string[]) {
  const renderer = new MarkdownRenderer(
    path.join(process.cwd(), 'autogen', 'conf.json')
  );
  await renderer.init();

  const slugPath = slug.join('/');
  const htmlPath = path.join(
    renderer.outputRoot!,
    slugPath + PageParser.HTML_SUFFIX
  );

  try {
    const htmlContent = await fs.readFile(htmlPath, 'utf-8');
    return {
      html: htmlContent,
    };
  } catch (error) {
    console.error(`Failed to read HTML for slug: ${slugPath}`, error);
    return {
      html: null,
      notFound: true,
    };
  }
}
