import process from 'node:process';

const isDev = process.env.NODE_ENV !== 'production';
// An absolute API base (e.g. a separate API domain) must be allowed to receive fetches.
const apiOrigin = /^https?:\/\//.test(process.env.NEXT_PUBLIC_API_BASE_URL ?? '') ? new URL(process.env.NEXT_PUBLIC_API_BASE_URL).origin : '';

// ponytail: 'unsafe-inline' scripts keep pages static (Next + next-themes inline bootstraps).
// Switch to per-request nonces if XSS hardening must go further; the main win here is
// frame-ancestors (clickjacking), object/base/form restrictions, and locked-down connect-src.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  ['connect-src', "'self'", 'https://*.supabase.co', 'wss://*.supabase.co', apiOrigin, isDev && 'ws:'].filter(Boolean).join(' '),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // Product thumbnails, avatars and banners live in Supabase Storage.
  images: { remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    // Covers for the store's own products, shipped in public/products.
    { protocol: 'https', hostname: 'synectrajasadigital.me', pathname: '/products/**' }] },
  // Dev only: proxy /api to the local Hono server. On Vercel, vercel.json routes /api to the function.
  async rewrites() {
    if (process.env.NODE_ENV === 'production') return [];
    return [{ source: '/api/:path*', destination: 'http://127.0.0.1:8788/api/:path*' }];
  },
};

export default nextConfig;
