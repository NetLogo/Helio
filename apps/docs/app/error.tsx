'use client';

import { cn } from '@repo/ui/lib/utils/cn';
import type { JSX } from 'react';

export default function ErrorPage({
  status = 404,
  title = 'Page Not Found',
  className,
  children,
}: ErrorPageProps): JSX.Element {
  return (
    <div className={cn('flex flex-col items-center justify-center min-h-screen', className)}>
      <h1 className="text-4xl bg-red-500 mt-[-3rem] w-200 text-center">{status}</h1>
      <p className="mt-4 text-xl text-gray-600">{title}</p>
      {children}
    </div>
  );
}

export enum ErrorStatus {
  NotFound = 404,
  InternalServerError = 500,
  BuildError = 501,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
}

export type ErrorPageProps = {
  status?: number;
  title?: string;
  className?: string;
  children?: React.ReactNode;
};
