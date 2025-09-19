'use client';

import Search from '@repo/ui/components/search';
import type { ReactNode } from 'react';

export default function Page(): ReactNode {
  return <Search indices={['Documenter']}></Search>;
}
