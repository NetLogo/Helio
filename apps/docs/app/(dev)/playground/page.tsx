'use client';

import type { SideCatalogItem } from '@repo/ui/widgets/SideCatalog';
import SideCatalog from '@repo/ui/widgets/SideCatalog';

export default function Page() {
  return (
    <SideCatalog
      label="Dictionary"
      items={catalogItems}
      itemPrefix="primitive:"
      query={query}
    >
      <main className="w-full xl:p-4">
        <h1>My Page</h1>
      </main>
    </SideCatalog>
  );
}

const catalogItems: Array<SideCatalogItem> = [
  { title: 'Home', url: '/' },
  { title: 'Search', url: '/search' },
  { title: 'Inbox', url: '/inbox' },
  { title: 'Calendar', url: '/calendar' },
  { title: 'Settings', url: '/settings' },
];

function query(s0: string) {
  const s = s0.toLowerCase();
  return catalogItems.filter((item) => item.title.toLowerCase().includes(s));
}
