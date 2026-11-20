import { Hono } from 'hono';
import type { User } from '@supabase/supabase-js';
import { memberMiddleware } from '../middlewares/member.middleware';
import { rateLimit } from '../middlewares/rate-limit.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { updateMemberDtoSchema, type UpdateMemberDto } from '../dtos';
import { orderRepository } from '../repositories/order.repository';
import { memberRepository } from '../repositories/member.repository';
import { profileRepository } from '../repositories/profile.repository';
import { fulfillmentService } from '../services/fulfillment.service';
import { successResponse, errorResponse } from '../utils/response';
import type { AppEnv, Order } from '../types';

export const memberRoutes = new Hono<AppEnv>();

memberRoutes.use('*', rateLimit({ windowMs: 60_000, max: 120 }));
memberRoutes.use('*', memberMiddleware);

const currentUser = (c: { get: (key: 'user') => unknown }) => c.get('user') as User & { email: string };

/** The buyer's own order: unmasked contact data and every line item with the price paid. */
export function toMemberOrder(order: Order) {
  const pick = (p: NonNullable<Order['product']>, price: number) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    category: p.category,
    thumbnail_url: p.thumbnail_url,
    price,
  });
  const items = order.items?.length
    ? order.items.filter((i) => i.product).map((i) => pick(i.product, i.price))
    : order.product
      ? [pick(order.product, order.amount)]
      : [];
  return {
    invoice_id: order.invoice_id,
    status: order.status,
    amount: order.amount,
    payment_method: order.payment_method,
    buyer_name: order.buyer_name,
    buyer_email: order.buyer_email,
    buyer_phone: order.buyer_phone,
    created_at: order.created_at,
    paid_at: order.status === 'PAID' ? order.updated_at : null,
    items,
  };
}

// GET /api/member/me — who is signed in, whether they are the store owner, and their saved account data
memberRoutes.get('/me', async (c) => {
  const user = currentUser(c);
  const [isAdmin, account] = await Promise.all([profileRepository.isOwner(user.id), memberRepository.get(user.id)]);
  return c.json(successResponse({ email: user.email, isAdmin, account }));
});

// GET /api/member/orders — every order placed with the signed-in email
memberRoutes.get('/orders', async (c) => {
  const orders = await orderRepository.getOrdersByEmail(currentUser(c).email);
  return c.json(successResponse(orders.map(toMemberOrder)));
});

// GET /api/member/orders/:invoiceId/access — purchase links, only for the buyer's own PAID order
memberRoutes.get('/orders/:invoiceId/access', async (c) => {
  const order = await orderRepository.getOrderByInvoiceId(c.req.param('invoiceId'));
  if (!order || order.buyer_email.toLowerCase() !== currentUser(c).email.toLowerCase()) {
    return c.json(errorResponse('Pesanan tidak ditemukan', 'NOT_FOUND'), 404);
  }
  if (order.status !== 'PAID') {
    return c.json(errorResponse('Pesanan belum lunas', 'NOT_PAID'), 403);
  }
  const downloads = await fulfillmentService.getDownloadLinksForOrder(order.invoice_id);
  return c.json(successResponse({ downloads }));
});

// PUT /api/member/account — save name, phone and address
memberRoutes.put('/account', validateBody(updateMemberDtoSchema), async (c) => {
  const account = await memberRepository.upsert(currentUser(c).id, c.get('validatedBody') as UpdateMemberDto);
  return c.json(successResponse(account, 'Data akun disimpan'));
});
