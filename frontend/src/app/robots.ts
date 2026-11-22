import type { MetadataRoute } from 'next';

// Keep crawlers on the public catalog; private and transactional pages stay out of search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/member', '/login', '/api/', '/checkout', '/cart', '/order/'] },
  };
}
