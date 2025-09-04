import '@repo/markdown/styles.scss';

import NetLogoMarkdown from '@repo/markdown';

import autogenConfig from './autogen.config';
import * as NetLogoDocs from './NetLogoDocs';

export default async function Page({ params }: { params: { slug: string[] } }) {
  const { slug } = await params;
  const { content } = await NetLogoDocs.getPageContent(slug, autogenConfig);
  return (
    <main className="min-h-screen prose">
      <NetLogoMarkdown>{content || '<p>Page not found.</p>'}</NetLogoMarkdown>
    </main>
  );
}

export async function generateStaticParams() {
  const results = await NetLogoDocs.generateMarkdownPages(autogenConfig);
  const generatedSlugs = Object.values(results)
    .filter((page) => page.success)
    .map((page) => page.baseName)
    .map((slug) => ({ slug: slug.split('/') }))
    .reduce(
      (acc, { slug }) => {
        acc.push({ slug });
        if (process.env.NODE_ENV !== 'production') {
          acc.push({ slug: [...slug.slice(0, -1), slug.at(-1) + '.html'] });
        }
        return acc;
      },
      [] as { slug: string[] }[]
    );

  return generatedSlugs;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string[] };
}) {
  // https://nextjs.org/docs/messages/sync-dynamic-apis
  const { slug } = await params;
  return NetLogoDocs.generateMetadata(slug, autogenConfig);
}
