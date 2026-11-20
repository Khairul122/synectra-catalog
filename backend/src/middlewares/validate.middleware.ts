import type { MiddlewareHandler } from 'hono';
import type { ZodSchema } from 'zod';
import type { AppEnv } from '../types';

export const validateBody = <T>(schema: ZodSchema<T>): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      rawBody = {};
    }

    const parsed = schema.parse(rawBody);
    c.set('validatedBody', parsed);
    await next();
  };
};

export const validateQuery = <T>(schema: ZodSchema<T>): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    const rawQuery = c.req.query();
    const parsed = schema.parse(rawQuery);
    c.set('validatedQuery', parsed);
    await next();
  };
};
