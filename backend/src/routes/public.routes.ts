import { Hono } from 'hono';
import { catalogService } from '@/services/catalog.service';
import { checkoutService, CheckoutError } from '@/services/checkout.service';
import { rateLimit } from '@/middlewares/rate-limit.middleware';
import type { Order } from '@/types';
import { fulfillmentService } from '@/services/fulfillment.service';
import { validateBody } from '@/middlewares/validate.middleware';
import { checkoutDtoSchema, type CheckoutDto } from '@/dtos';
import { successResponse, errorResponse } from '@/utils/response';
import type { AppEnv } from '@/types';

export const publicRoutes = new Hono<AppEnv>();

// Anyone holding the invoice id can read this: expose only what the status page needs.
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 1)}***@${domain ?? ''}`;
}

export function toPublicOrder(order: Order) {
  return {
    invoice_id: order.invoice_id,
    status: order.status,
    amount: order.amount,
    buyer_name: order.buyer_name,
    buyer_email: maskEmail(order.buyer_email),
    payment_url: order.status === 'PENDING' ? order.payment_url : null,
    created_at: order.created_at,
    product: order.product
      ? {
          id: order.product.id,
          title: order.product.title,
          category: order.product.category,
          price: order.product.price,
          thumbnail_url: order.product.thumbnail_url,
        }
      : undefined,
  };
}

// GET /api/catalog — Data publik (profil, links, produk aktif)
publicRoutes.get('/catalog', async (c) => {
  const category = c.req.query('category');
  const catalog = await catalogService.getCatalog(category);
  return c.json(successResponse(catalog));
});

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

publicRoutes.use('/checkout', rateLimit({ windowMs: 60_000, max: 10 }));
publicRoutes.use('/order/*', rateLimit({ windowMs: 60_000, max: 60 }));

// POST /api/checkout — Buat order baru dan generate URL pembayaran DOKU
publicRoutes.post('/checkout', validateBody(checkoutDtoSchema), async (c) => {
  const dto = c.get('validatedBody') as CheckoutDto;
  const idempotencyKey = c.req.header('Idempotency-Key');
  if (idempotencyKey !== undefined && !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    return c.json(errorResponse('Idempotency-Key tidak valid', 'INVALID_IDEMPOTENCY_KEY'), 400);
  }

  try {
    const result = await checkoutService.initiateCheckout(dto, idempotencyKey);
    return c.json(successResponse(result, 'Checkout berhasil dibuat'), 201);
  } catch (error) {
    if (error instanceof CheckoutError) {
      return c.json(errorResponse(error.message, 'CHECKOUT_FAILED'), error.status);
    }
    // Provider/DB failure: log internally, never echo internal messages to the buyer.
    console.error('[checkout]', error instanceof Error ? error.message : error);
    return c.json(errorResponse('Layanan pembayaran sedang bermasalah. Coba lagi beberapa saat.', 'PAYMENT_PROVIDER_UNAVAILABLE'), 502);
  }
});

// GET /api/order/:invoiceId — Periksa status pembayaran invoice
publicRoutes.get('/order/:invoiceId', async (c) => {
  const invoiceId = c.req.param('invoiceId');
  const order = await checkoutService.getOrder(invoiceId);

  if (!order) {
    return c.json(errorResponse('Order tidak ditemukan', 'NOT_FOUND'), 404);
  }

  return c.json(successResponse(toPublicOrder(order)));
});

// GET /api/order/:invoiceId/download — Dapatkan tautan unduh aset digital jika order lunas
publicRoutes.get('/order/:invoiceId/download', async (c) => {
  const invoiceId = c.req.param('invoiceId');
  try {
    const downloadUrl = await fulfillmentService.getDownloadLinkForOrder(invoiceId);
    return c.json(successResponse({ downloadUrl }, 'Tautan unduhan berhasil dibuat'));
  } catch (error) {
    console.error('[download]', error instanceof Error ? error.message : error);
    return c.json(errorResponse('Akses unduhan ditolak: Pesanan belum lunas atau tidak valid.', 'DOWNLOAD_DENIED'), 403);
  }
});
