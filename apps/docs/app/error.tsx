'use client';

import { cn } from '@repo/ui/lib/utils/cn';

export default function ErrorPage({
  status = 404,
  title = 'Page Not Found',
  className,
  children,
}: ErrorPageProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center min-h-screen', className)}>
      <h1 className="text-4xl bg-red-500 mt-0">{status}</h1>
      <p className="mt-4 text-xl text-gray-600">{title}</p>
      {children && <div className="mt-6">{children}</div>}
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

export interface ErrorPageProps {
  status?: number;
  title?: string;
  className?: string;
  children?: React.ReactNode;
}
