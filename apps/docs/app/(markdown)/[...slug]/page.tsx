import fs from 'fs/promises';
import path from 'path';

import NetLogoMarkdown from '@repo/markdown';
import MustacheRenderer from '@repo/mustache';

const configPath = path.join(process.cwd(), 'autogen', 'conf.json');

export default async function Page({ params }: { params: { slug: string[] } }) {
  const { slug } = await params;
  const { content } = await getPageContent(slug);
  return (
    <main className="min-h-screen prose">
      <NetLogoMarkdown>{content || '<p>Page not found.</p>'}</NetLogoMarkdown>
    </main>
  );
}

export async function generateStaticParams() {
  const renderer = await MustacheRenderer.fromConfigPath(configPath);
  const results = await renderer.build();

  const generatedSlugs = Object.values(results.pages)
    .filter((page) => page.success)
    .map((page) => page.baseName)
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

  const renderer = await MustacheRenderer.fromConfigPath(configPath);

  const slugPath = slug.join('/');
  const metadataPath = renderer.getMetadataFilePath(slugPath);

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

export async function getPageContent(slug: string[]) {
  const renderer = await MustacheRenderer.fromConfigPath(configPath);

  const slugPath = slug.join('/');
  const outputPath = renderer.getOutputFilePath(slugPath, 'md');

  try {
    const outputContent = await fs.readFile(outputPath, 'utf-8');
    return {
      content: outputContent,
    };
  } catch (error) {
    console.error(`Failed to read output for slug: ${slugPath}`, error);
    return {
      content: null,
      notFound: true,
    };
  }
}
