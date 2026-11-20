const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/api/:path*', destination: 'http://127.0.0.1:8788/api/:path*' }];
  },
};

export default nextConfig;
