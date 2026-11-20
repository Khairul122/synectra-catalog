import { Hono } from 'hono';
import { publicRoutes } from './public.routes';
import { webhookRoutes } from './webhook.routes';
import { adminRoutes } from './admin.routes';
import { memberRoutes } from './member.routes';
import type { AppEnv } from '../types';

export const apiRouter = new Hono<AppEnv>();

// Health check
apiRouter.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'synectra-backend-api',
  });
});

// Route groupings
apiRouter.route('/', publicRoutes);
apiRouter.route('/webhooks', webhookRoutes);
apiRouter.route('/admin', adminRoutes);
apiRouter.route('/member', memberRoutes);
