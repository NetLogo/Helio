'use client';

import useSWR from 'swr';

import type { SideCatalogItem } from '@repo/ui/widgets/SideCatalog';
import SideCatalog from '@repo/ui/widgets/SideCatalog';
import { LocalStorageCache } from '@repo/utils/lib/swr';

import type { JSX } from 'react';
import type { PrimitiveCatalogProps } from './types';

type CatalogItem = SideCatalogItem & { id: string };
export default function PrimitiveCatalog({
  dictionaryDisplayName,
  dictionaryHomeDirectory,
  indexFileURI,
  currentItemId,
  currentItemLabel,
  children,
}: PrimitiveCatalogProps): JSX.Element {
  const { data, isLoading, ...rest } = useSWR(indexFileURI, fetcher, {
    provider: () => new LocalStorageCache(),
  });

  const catalogItems = isLoading || rest.error instanceof Error ? [] : (data as Array<CatalogItem>);

  return (
    <SideCatalog
      label={dictionaryDisplayName}
      items={catalogItems}
      itemPrefix="primitive:"
      query={makeQueryFunction(catalogItems)}
      isSelected={(current) => (current as CatalogItem).id === currentItemId}
      selectedItemLabel={currentItemLabel}
      scrollMarginTop={150}
      isLoading={isLoading}
      withRouteTransition
    >
      <div className="w-full [&>.min-h-screen]:min-h-0">
        {children}
        <p className="p-4 md:p-0">
          Take me to the full <a href={dictionaryHomeDirectory}>{dictionaryDisplayName}</a>.
        </p>
      </div>
    </SideCatalog>
  );
}

const fetcher = async (
  url: string
): Promise<
  Array<{
    id: string | undefined;
    title: string | undefined;
    url: string | undefined;
  }>
> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Network response was not ok');
  }
  const text = await res.text();
  return text
    .split('\n')
    .map((line) => line.trim())
    .map((line) => line.split(' '))
    .filter((parts) => parts.length === 2)
    .map((parts) => ({
      id: parts[1]?.split('/').pop()?.replace('.html', '') ?? parts[0],
      title: parts[0],
      url: parts[1],
    }));
};

const makeQueryFunction =
  (items: Array<SideCatalogItem>) =>
  (s0: string): Array<SideCatalogItem> => {
    const s = s0.toLowerCase();
    return items.filter((item) => item.title.toLowerCase().includes(s));
  };
