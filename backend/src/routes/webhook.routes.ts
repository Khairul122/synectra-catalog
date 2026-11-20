import { Hono } from 'hono';
import { dokuWebhookMiddleware } from '../middlewares/doku.middleware';
import { fulfillmentService } from '../services/fulfillment.service';
import { dokuNotificationDtoSchema } from '../dtos';
import { successResponse, errorResponse } from '../utils/response';
import type { AppEnv } from '../types';

export const webhookRoutes = new Hono<AppEnv>();

// POST /api/webhooks/doku — Listener notifikasi transaksi pembayaran DOKU
webhookRoutes.post('/doku', dokuWebhookMiddleware, async (c) => {
  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json(errorResponse('Format request tidak valid', 'INVALID_JSON'), 400);
  }

  const parsed = dokuNotificationDtoSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json(
      errorResponse('Payload notifikasi DOKU tidak sesuai format', 'SCHEMA_MISMATCH', parsed.error.errors),
      400,
    );
  }

  try {
    const result = await fulfillmentService.processNotification(parsed.data);
    return c.json(successResponse(result, 'Notifikasi berhasil diproses'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memproses notifikasi';
    return c.json(errorResponse(message, 'FULFILLMENT_FAILED'), 500);
  }
});
