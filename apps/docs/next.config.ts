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
  sassOptions: {
    quiteDeps: true,
  },
  basePath: process.env['BASE_PATH'] ?? '',
};

export default nextConfig;
