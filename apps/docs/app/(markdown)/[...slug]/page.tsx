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
  return NetLogoDocs.generateStaticParams(autogenConfig);
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
