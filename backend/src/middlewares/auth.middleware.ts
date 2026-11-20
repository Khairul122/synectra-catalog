import type { MiddlewareHandler } from 'hono';
import { supabaseAdmin } from '../infrastructure/supabase.admin';
import { env } from '../config/env';
import { profileRepository } from '../repositories/profile.repository';
import { errorResponse } from '../utils/response';
import type { AppEnv } from '../types';

export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      errorResponse('Akses ditolak: Token autentikasi tidak ditemukan', 'UNAUTHORIZED'),
      401,
    );
  }

  const token = authHeader.replace('Bearer ', '').trim();

  // Automated-test bypass only (vitest sets NODE_ENV=test).
  if (env.NODE_ENV === 'test' && token === 'test-admin-token') {
    c.set('user', { id: 'test-admin-id', email: 'admin@synectra.id' });
    await next();
    return;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return c.json(
      errorResponse('Akses ditolak: Token tidak valid atau sesi berakhir', 'UNAUTHORIZED'),
      401,
    );
  }

  // Authenticated is not enough: only the store owner (has a profiles row) is admin.
  if (!(await profileRepository.isOwner(data.user.id))) {
    return c.json(errorResponse('Akses ditolak: Akun bukan admin toko', 'FORBIDDEN'), 403);
  }

  c.set('user', data.user);
  await next();
};
