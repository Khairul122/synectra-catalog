import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '@/app';
import { supabaseAdmin } from '@/infrastructure/supabase.admin';
import { orderRepository } from '@/repositories/order.repository';
import { fulfillmentService } from '@/services/fulfillment.service';
import type { Order } from '@/types';

const user = { id: 'u1', email: 'budi@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' };
const order = (overrides: Partial<Order> = {}) =>
  ({
    invoice_id: 'INV-1',
    status: 'PAID',
    amount: 50000,
    buyer_email: 'Budi@Example.com',
    buyer_name: 'Budi',
    items: [{ price: 50000, product: { id: 'p1', title: 'Produk', category: 'Digital' } }],
    ...overrides,
  }) as Order;

const get = (path: string) => app.request(`/api/member${path}`, { headers: { Authorization: 'Bearer tok', 'x-forwarded-for': '10.9.0.1' } });

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(supabaseAdmin.auth, 'getUser').mockResolvedValue({ data: { user }, error: null } as never);
});

describe('member area', () => {
  it('rejects requests without a token or with an unverified email', async () => {
    expect((await app.request('/api/member/orders')).status).toBe(401);
    vi.spyOn(supabaseAdmin.auth, 'getUser').mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null } as never);
    expect((await get('/orders')).status).toBe(401);
  });

  it('lists orders by the signed-in email with item prices', async () => {
    const byEmail = vi.spyOn(orderRepository, 'getOrdersByEmail').mockResolvedValue([order()]);
    const body = (await (await get('/orders')).json()) as { data: Array<{ items: Array<{ price: number }> }> };
    expect(byEmail).toHaveBeenCalledWith('budi@example.com');
    expect(body.data[0].items[0].price).toBe(50000);
  });

  it('hands out links only for the buyer’s own paid order', async () => {
    const links = vi.spyOn(fulfillmentService, 'getDownloadLinksForOrder').mockResolvedValue([{ productId: 'p1', title: 'Produk', url: 'https://x.test' }]);
    const getOrder = vi.spyOn(orderRepository, 'getOrderByInvoiceId');

    getOrder.mockResolvedValue(order({ buyer_email: 'other@example.com' }));
    expect((await get('/orders/INV-1/access')).status).toBe(404);
    getOrder.mockResolvedValue(order({ status: 'PENDING' }));
    expect((await get('/orders/INV-1/access')).status).toBe(403);
    expect(links).not.toHaveBeenCalled();

    getOrder.mockResolvedValue(order());
    expect((await get('/orders/INV-1/access')).status).toBe(200);
  });
});

describe('getOrdersByEmail', () => {
  it('escapes LIKE wildcards so an email cannot match other buyers', async () => {
    const ilike = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) });
    vi.spyOn(supabaseAdmin, 'from').mockReturnValue({ select: () => ({ ilike }) } as never);
    await orderRepository.getOrdersByEmail('a_b%c@x.com');
    expect(ilike).toHaveBeenCalledWith('buyer_email', String.raw`a\_b\%c@x.com`);
  });
});
