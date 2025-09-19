import { Button } from '@repo/ui/components/button';
import Link from 'next/link';
import ErrorPage from './error';

export default function NotFound() {
  return (
    <ErrorPage status={404} title="Page Not Found" className="[&>h1]:bg-red-500">
      <p className="mt-4 text-xl text-gray-600">
        Sorry, we couldn't find the page you're looking for.
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
