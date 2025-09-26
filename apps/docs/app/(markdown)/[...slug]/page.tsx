// @ts-expect-error Linter can't access SCSS
import '@repo/markdown/styles.scss';

import type { Metadata } from 'next';
import type { JSX } from 'react';

import type { NetLogoMarkdownProps } from '@repo/markdown';
import NetLogoMarkdown, { defaultComponents, getDefaultRemarkPlugins } from '@repo/markdown';

import type { PageResult } from '@repo/template';

import Image from '@repo/ui/HOC/Image';
import { defined } from '@repo/utils/std/null';

import autogenConfig from './autogen.config';
import * as NetLogoDocs from './NetLogoDocs';

import { Env } from '../../../env';
import NotFound from '../../not-found';
import { withBasePath } from '../../utils';
import PrimitiveCatalog from './(PrimitiveCatalog)';
import { PrimitiveCatalogPropsSchema } from './(PrimitiveCatalog)/types';

export default async function Page({
  params,
}: {
  params: Promise<{ slug: Array<string> }>;
}): Promise<JSX.Element> {
  const { slug } = await params;
  const { content } = await NetLogoDocs.getPageContent(slug, autogenConfig);
  const { layout, ...metadata } = await NetLogoDocs.getPageMetadata(slug, autogenConfig);

  const scanRoot: string | undefined = metadata.projectConfig?.scanRoot;
  const isScanRootRelative = defined(scanRoot) && !scanRoot.startsWith('/');
  const assetsRoot = isScanRootRelative
    ? [process.cwd(), ...scanRoot.split('/')]
    : ['/', ...(scanRoot?.split('/').slice(1) ?? [])];

  const imageProps = {
    nextOptions: {
      root: assetsRoot,
      copy: true,
      publicSubdir: [
        'images',
        ...slug
          .join('/')
          .replace(/\.html$/, '')
          .split('/'),
      ],
      basePath: Env.basePath,
      shareImages: true,
    },
  };

  let markdownProps: NetLogoMarkdownProps = {
    components: {
      ...defaultComponents,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      img: ({ node: _, ...props }) => (
        <Image
          {...props}
          {...imageProps}
          // eslint-disable-next-line react/prop-types
          alt={props.alt ?? 'NetLogo Docs Image'}
        />
      ),
    },
  };

  if ((slug.at(-1) ?? '').startsWith('faq')) {
    markdownProps = {
      ...markdownProps,
      remarkPlugins: getDefaultRemarkPlugins({
        remarkTocOptions: { maxDepth: 3, heading: 'Table of Contents' },
      }),
    };
  }

  if (!defined(content)) {
    return <NotFound />;
  }

  const children = (
    <main className="min-h-screen prose">
      <NetLogoMarkdown {...markdownProps}>{content}</NetLogoMarkdown>
    </main>
  );

  let RootNode = children;
  switch (layout) {
    case 'catalog': {
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
          indexFileURI={withBasePath(indexFileURI)}
          currentItemLabel={currentItemLabel}
          currentItemId={currentItemId}
        >
          {children}
        </PrimitiveCatalog>
      );
      break;
    }
    case 'default':
      break;
  }

  return RootNode;
}

export async function generateStaticParams(): Promise<Array<{ slug: Array<string> }>> {
  const results = await NetLogoDocs.generateMarkdownPages(autogenConfig);
  return generateSlugs(results);
}

export async function generateSlugs(
  results: Array<PageResult>
): Promise<Array<{ slug: Array<string> }>> {
  const generatedSlugs = results
    .filter((page) => page.success)
    .map((page) => page.baseName)
    .map((slug) => ({ slug: slug.split('/') }))
    .reduce<Array<{ slug: Array<string> }>>((acc, { slug }) => {
      acc.push({ slug });

      if (process.env.NODE_ENV !== 'production') {
        const versionedSlug = [Env.productVersion, ...slug];
        [slug, versionedSlug].forEach((s) => {
          acc.push({ slug: [...s.slice(0, -1), (s.at(-1) ?? '') + '.html'] });
        });
      }
      return acc;
    }, []);

  return generatedSlugs;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: Array<string> }>;
}): Promise<Metadata> {
  // https://nextjs.org/docs/messages/sync-dynamic-apis
  const { slug } = await params;
  return NetLogoDocs.getPageMetadata(slug, autogenConfig);
}
