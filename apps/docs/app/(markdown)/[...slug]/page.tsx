// @ts-expect-error Linter can't access SCSS
import '@repo/markdown/styles.scss';

import NetLogoMarkdown from '@repo/markdown';
import { applyNextBasePath } from '@repo/next-utils/url';

import autogenConfig from './autogen.config';
import * as NetLogoDocs from './NetLogoDocs';

import PrimitiveCatalog from './(PrimitiveCatalog)';
import { PrimitiveCatalogPropsSchema } from './(PrimitiveCatalog)/types';

export default async function Page({
  params,
}: {
  params: { slug: Array<string> };
}) {
  const { slug } = await params;
  const { content } = await NetLogoDocs.getPageContent(slug, autogenConfig);
  const { layout, ...metadata } = await NetLogoDocs.getPageMetadata(
    slug,
    autogenConfig
  );

  const children = (
    <main className="min-h-screen prose">
      <NetLogoMarkdown>{content || '<p>Page not found.</p>'}</NetLogoMarkdown>
    </main>
  );

  let RootNode;
  switch (layout) {
    case 'catalog':
      const {
        dictionaryDisplayName,
        dictionaryHomeDirectory,
        indexFileURI,
        currentItemId,
        currentItemLabel,
      } = PrimitiveCatalogPropsSchema.parse(metadata);
      RootNode = (
        <PrimitiveCatalog
          dictionaryDisplayName={dictionaryDisplayName}
          dictionaryHomeDirectory={dictionaryHomeDirectory}
          indexFileURI={applyNextBasePath(indexFileURI)}
          currentItemLabel={currentItemLabel}
          currentItemId={currentItemId}
        >
          {children}
        </PrimitiveCatalog>
      );
      break;
    default:
      RootNode = children;
  }

  return <>{RootNode}</>;
}

export async function generateStaticParams() {
  const results = await NetLogoDocs.generateMarkdownPages(autogenConfig);

  const generatedSlugs = results
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
      [] as Array<{ slug: Array<string> }>
    );

  return generatedSlugs;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: Array<string> };
}) {
  // https://nextjs.org/docs/messages/sync-dynamic-apis
  const { slug } = await params;
  return NetLogoDocs.getPageMetadata(slug, autogenConfig);
}
