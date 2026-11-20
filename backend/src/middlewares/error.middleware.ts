import type { Context } from 'hono';
import { ZodError } from 'zod';
import { errorResponse } from '../utils/response';

const DATABASE_UNREACHABLE = /fetch failed|TimeoutError|ECONNREFUSED|ENOTFOUND/;

export const errorHandler = (err: Error, c: Context) => {
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return c.json(
      errorResponse('Validation error', 'VALIDATION_FAILED', formattedErrors),
      400,
    );
  }

  // Log method/path/message only — never headers or bodies (tokens, buyer PII, signatures).
  console.error(`[api] ${c.req.method} ${c.req.path}: ${err.message}`);
  const isDev = process.env.NODE_ENV !== 'production';

  // Supabase unreachable (not started, wrong URL, timeout): a dependency outage, not a code bug.
  if (DATABASE_UNREACHABLE.test(err.message)) {
    return c.json(
      errorResponse(
        isDev ? 'Database tidak dapat dihubungi. Jalankan `npx supabase start` dan isi SUPABASE_URL di .env.' : 'Service temporarily unavailable',
        'DATABASE_UNAVAILABLE',
      ),
      503,
    );
  }

  return c.json(
    errorResponse(
      isDev ? err.message || 'Internal server error' : 'Internal server error',
      'INTERNAL_SERVER_ERROR',
      isDev ? { stack: err.stack } : undefined,
    ),
    500,
  );
};
