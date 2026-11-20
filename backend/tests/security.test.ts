import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '@/app';
import { checkoutService } from '@/services/checkout.service';
import { orderRepository, DuplicateOrderError } from '@/repositories/order.repository';
import { productRepository } from '@/repositories/product.repository';
import { profileRepository } from '@/repositories/profile.repository';
import { supabaseAdmin } from '@/infrastructure/supabase.admin';
import { dokuAdapter } from '@/infrastructure/doku.adapter';
import { resendAdapter } from '@/infrastructure/resend.adapter';
import type { Order } from '@/types';

const productId = '11111111-1111-4111-8111-111111111111';
const dto = { productIds: [productId], buyerName: 'Buyer', buyerEmail: 'buyer@example.com', buyerPhone: '6281234567890' };
const product = { id: productId, title: 'Asset', price: 25000, file_path: 'secret/asset.zip', is_active: true };
const order = {
  id: 'o1', invoice_id: 'INV-1', product_id: productId, buyer_name: 'Buyer', buyer_email: 'buyer@example.com',
  amount: 25000, status: 'PENDING', payment_url: 'https://doku.test/pay', idempotency_key: 'key-12345678',
  doku_reference: 'REF', payment_error: 'internal stack detail', fulfillment_error: null, fulfillment_state: 'PENDING',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', product,
} as unknown as Order;

const post = (ip: string, headers: Record<string, string> = {}) =>
  app.request('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip, ...headers },
    body: JSON.stringify(dto),
  });

beforeEach(() => vi.restoreAllMocks());

describe('admin authorization', () => {
  it('rejects a valid Supabase user who is not the store owner', async () => {
    vi.spyOn(supabaseAdmin.auth, 'getUser').mockResolvedValue({ data: { user: { id: 'stranger' } }, error: null } as never);
    vi.spyOn(profileRepository, 'isOwner').mockResolvedValue(false);
    const res = await app.request('/api/admin/orders', { headers: { Authorization: 'Bearer real-but-not-admin' } });
    expect(res.status).toBe(403);
  });
});

describe('checkout idempotency', () => {
  it('replays the existing order for a reused key without calling DOKU', async () => {
    vi.spyOn(orderRepository, 'getOrderByIdempotencyKey').mockResolvedValue(order);
    const doku = vi.spyOn(dokuAdapter, 'createCheckout');
    const result = await checkoutService.initiateCheckout(dto, 'key-12345678');
    expect(result).toMatchObject({ invoiceId: 'INV-1', paymentUrl: 'https://doku.test/pay' });
    expect(doku).not.toHaveBeenCalled();
  });

  it('resolves a concurrent insert race to the winning order', async () => {
    vi.spyOn(orderRepository, 'getOrderByIdempotencyKey').mockResolvedValueOnce(null).mockResolvedValueOnce(order);
    vi.spyOn(productRepository, 'getProductById').mockResolvedValue(product as never);
    vi.spyOn(orderRepository, 'createOrder').mockRejectedValue(new DuplicateOrderError('dup'));
    const result = await checkoutService.initiateCheckout(dto, 'key-12345678');
    expect(result.invoiceId).toBe('INV-1');
  });

  it('rejects a key reused for a different buyer with 409', async () => {
    vi.spyOn(orderRepository, 'getOrderByIdempotencyKey').mockResolvedValue({ ...order, buyer_email: 'other@example.com' });
    const res = await post('10.0.0.1', { 'Idempotency-Key': 'key-12345678' });
    expect(res.status).toBe(409);
  });

  it('rejects malformed idempotency keys', async () => {
    const res = await post('10.0.0.2', { 'Idempotency-Key': 'bad key!' });
    expect(res.status).toBe(400);
  });
});

describe('provider failure handling', () => {
  it('masks internal errors from the buyer with 502', async () => {
    vi.spyOn(checkoutService, 'initiateCheckout').mockRejectedValue(new Error('OrderRepository.createOrder failed: secret detail'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post('10.0.0.3');
    const json = (await res.json()) as { message: string };
    expect(res.status).toBe(502);
    expect(json.message).not.toContain('secret detail');
  });
});

describe('rate limiting', () => {
  it('returns 429 after 10 checkouts per minute from one IP', async () => {
    vi.spyOn(checkoutService, 'initiateCheckout').mockResolvedValue({ invoiceId: 'x', amount: 1, paymentUrl: 'u', productTitle: 't' });
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) statuses.push((await post('10.0.0.4')).status);
    expect(statuses.slice(0, 10).every((s) => s === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
    expect((await post('10.0.0.5')).status).toBe(201);
  });
});

describe('public order exposure', () => {
  it('hides file path, internal errors and full email', async () => {
    vi.spyOn(orderRepository, 'getOrderByInvoiceId').mockResolvedValue(order);
    vi.spyOn(dokuAdapter, 'getOrderStatus').mockResolvedValue(null);
    const res = await app.request('/api/order/INV-1', { headers: { 'x-forwarded-for': '10.0.0.6' } });
    const body = JSON.stringify(await res.json());
    expect(res.status).toBe(200);
    expect(body).not.toContain('secret/asset.zip');
    expect(body).not.toContain('internal stack detail');
    expect(body).not.toContain('buyer@example.com');
    expect(body).toContain('b***@example.com');
  });
});

describe('delivery email', () => {
  it('escapes buyer-controlled HTML', async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: 'e1' }, error: null });
    (resendAdapter as unknown as { resend: { emails: { send: typeof send } } }).resend = { emails: { send } };
    await resendAdapter.sendProductDeliveryEmail({
      to: 'b@example.com', buyerName: '<img src=x onerror=alert(1)>', invoiceId: 'INV', downloads: [{ title: 'P', url: 'https://x/y?a=1&b=2' }],
    });
    const html = send.mock.calls[0][0].html as string;
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });
});
