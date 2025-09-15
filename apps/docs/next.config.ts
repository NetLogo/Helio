import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  basePath: `/${process.env['PRODUCT_VERSION']}`,
  publicRuntimeConfig: {
    basePath: `/${process.env['PRODUCT_VERSION']}`,
  },
};

export default nextConfig;
