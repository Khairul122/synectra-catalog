import type { MiddlewareHandler } from 'hono';
import { errorResponse } from '../utils/response';
import type { AppEnv } from '../types';

// ponytail: in-memory fixed window, per serverless instance. Upgrade to Upstash/Redis
// if abuse spreads across instances or limits must be global.
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }): MiddlewareHandler<AppEnv> {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return async (c, next) => {
    const now = Date.now();
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'unknown';

    if (hits.size > 10_000) {
      for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
    }

    let entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return c.json(errorResponse('Terlalu banyak permintaan. Coba lagi nanti.', 'RATE_LIMITED'), 429);
    }

    await next();
  };
}
