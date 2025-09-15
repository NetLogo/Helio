'use client';

import useSWR from 'swr';

import type { SideCatalogItem } from '@repo/ui/widgets/SideCatalog';
import SideCatalog from '@repo/ui/widgets/SideCatalog';

import ErrorPage, { ErrorStatus } from '../../../error';
import { PrimitiveCatalogProps } from './types';

type CatalogItem = SideCatalogItem & { id: string };
export default function PrimitiveCatalog({
  dictionaryDisplayName,
  dictionaryHomeDirectory,
  indexFileURI,
  currentItemId,
  currentItemLabel,
  children,
}: PrimitiveCatalogProps) {
  const { data, error, isLoading } = useSWR(indexFileURI, fetcher);

  if (error) {
    return (
      <ErrorPage status={ErrorStatus.BuildError} title="Error loading catalog">
        Unable to load the {dictionaryDisplayName} (at {indexFileURI}): {error.message}
      </ErrorPage>
    );
  }

  let catalogItems = isLoading ? [] : (data as Array<CatalogItem>);

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
      <div className="w-full">
        {children}
        <p className="p-4 md:p-0">
          Take me to the full <a href={dictionaryHomeDirectory}>{dictionaryDisplayName}</a>.
        </p>
      </div>
    </SideCatalog>
  );
}

const fetcher = async (url: string) => {
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

const makeQueryFunction = (items: Array<SideCatalogItem>) => (s0: string) => {
  const s = s0.toLowerCase();
  return items.filter((item) => item.title.toLowerCase().includes(s));
};
