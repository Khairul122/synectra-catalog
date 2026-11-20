import type { MiddlewareHandler } from 'hono';
import { supabaseAdmin } from '../infrastructure/supabase.admin';
import { errorResponse } from '../utils/response';
import type { AppEnv } from '../types';

/** Any signed-in user with a verified email. Orders are matched by that email, so it must be confirmed. */
export const memberMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json(errorResponse('Silakan login terlebih dahulu', 'UNAUTHORIZED'), 401);
  }
  const { data, error } = await supabaseAdmin.auth.getUser(authHeader.slice(7).trim());
  if (error || !data?.user?.email || !data.user.email_confirmed_at) {
    return c.json(errorResponse('Sesi berakhir, silakan login lagi', 'UNAUTHORIZED'), 401);
  }
  c.set('user', data.user);
  await next();
};
