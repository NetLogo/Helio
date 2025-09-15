'use client';

export default function ErrorPage({
  status = 404,
  title = 'Page Not Found',
  children,
}: ErrorPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-6xl text-center font-bold text-gray-800 bg-red-500">
        {status}
      </h1>
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
  children?: React.ReactNode;
}
