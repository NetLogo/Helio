import { Button } from '@repo/ui/components/button';
import Link from 'next/link';
import type { JSX } from 'react';
import ErrorPage from './error';

export default function NotFound(): JSX.Element {
  return (
    <ErrorPage status={404} title="Page Not Found" className="[&>h1]:bg-red-500">
      <p className="mt-4 text-xl text-gray-600">
        Sorry, we couldn&apos;t find the page you&apos;re looking for.
      </p>
      <div className="mt-6 flex gap-4">
        <Button variant="default" asChild>
          <Link href="/">Go to Home</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/search">Search Documentation</Link>
        </Button>
      </div>
    </ErrorPage>
  );
}
