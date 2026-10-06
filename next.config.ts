import type { NextConfig } from 'next';
const basePath = (process.env.BASE_PATH || '').replace(/\/$/, '');
if (basePath && (!basePath.startsWith('/') || !/^\/[a-zA-Z0-9/_-]+$/.test(basePath)))
  throw new Error('BASE_PATH must be a URL path such as /projects/parallax');
const config: NextConfig = {
  turbopack: { root: process.cwd() },
  devIndicators: false,
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};
export default config;
