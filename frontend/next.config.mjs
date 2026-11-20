import process from 'node:process';

const nextConfig = {
  reactStrictMode: true,
  // Product thumbnails, avatars and banners live in Supabase Storage.
  images: { remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' }] },
  // Dev only: proxy /api to the local Hono server. On Vercel, vercel.json routes /api to the function.
  async rewrites() {
    if (process.env.NODE_ENV === 'production') return [];
    return [{ source: '/api/:path*', destination: 'http://127.0.0.1:8788/api/:path*' }];
  },
};

export default nextConfig;
