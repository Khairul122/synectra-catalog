import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { apiRouter } from '@/routes';
import { errorHandler } from '@/middlewares/error.middleware';
import type { AppEnv } from '@/types';

export const app = new Hono<AppEnv>().basePath('/api');

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'Client-Id', 'Request-Id', 'Request-Timestamp', 'Signature'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
  }),
);

app.onError(errorHandler);
app.route('/', apiRouter);

app.notFound((c) => {
  return c.json({ success: false, message: 'API route not found' }, 404);
});
