export default async function MarkdownLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: Array<string> };
}) {
  const { slug } = await params;
  const baseHref = '../'.repeat(Math.max(0, slug.length - 1)) || './';

  return (
    <>
      <head>
        <base href={baseHref} />
      </head>
      {children}
    </>
  );
}
