import { Button } from '@repo/ui/components/button';
import ErrorPage from './error';

export default function NotFound() {
  return (
    <ErrorPage status={404} title="Page Not Found" className="[&>h1]:bg-red-500">
      <p className="mt-4 text-xl text-gray-600">
        Sorry, we couldn't find the page you're looking for.
      </p>
      <div className="mt-6 flex gap-4">
        <a href="/">
          <Button variant="default" asChild>
            Go to Home
          </Button>
        </a>
        <a href="/search">
          <Button variant="outline" asChild>
            Search Documentation
          </Button>
        </a>
      </div>
    </ErrorPage>
  );
}
