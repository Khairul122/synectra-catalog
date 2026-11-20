import type { MiddlewareHandler } from 'hono';
import { dokuAdapter } from '../infrastructure/doku.adapter';
import { errorResponse } from '../utils/response';
import type { AppEnv } from '../types';

export const dokuWebhookMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const clientId = c.req.header('Client-Id');
  const requestId = c.req.header('Request-Id');
  const timestamp = c.req.header('Request-Timestamp');
  const signature = c.req.header('Signature');

  if (!clientId || !requestId || !timestamp || !signature) {
    console.warn('[doku-webhook] rejected: missing headers');
    return c.json(
      errorResponse('DOKU Webhook header tidak lengkap', 'INVALID_HEADERS'),
      400,
    );
  }

  const rawBody = await c.req.text();
  const requestTarget = '/api/webhooks/doku';

  const isValid = dokuAdapter.verifySignature(
    clientId,
    requestId,
    timestamp,
    signature,
    requestTarget,
    rawBody,
  );

  if (!isValid) {
    console.warn(`[doku-webhook] rejected: invalid signature (timestamp ${timestamp})`);
    return c.json(
      errorResponse('DOKU Webhook signature tidak valid', 'INVALID_SIGNATURE'),
      403,
    );
  }

  await next();
};
