import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '@/app';
import {
  checkoutDtoSchema,
  createProductDtoSchema,
  createLinkDtoSchema,
  updateProfileDtoSchema,
  dokuNotificationDtoSchema,
} from '@/dtos';
import { fulfillmentService } from '@/services/fulfillment.service';
import { orderRepository } from '@/repositories/order.repository';
import { resendAdapter } from '@/infrastructure/resend.adapter';
import type { Order, OrderStatus } from '@/types';

const productId = '11111111-1111-4111-8111-111111111111';

beforeEach(() => vi.restoreAllMocks());

describe('DTO validation', () => {
  it('checkout: accepts valid input and trims', () => {
    const parsed = checkoutDtoSchema.parse({ productId, buyerName: '  Budi  ', buyerEmail: ' budi@example.com ', buyerPhone: '0812-3456 7890' });
    expect(parsed).toEqual({ productIds: [productId], buyerName: 'Budi', buyerEmail: 'budi@example.com', buyerPhone: '6281234567890' });
  });

  it('checkout: accepts a cart, dedupes ids, rejects empty or oversized carts', () => {
    const other = '22222222-2222-4222-8222-222222222222';
    const base = { buyerName: 'Budi', buyerEmail: 'budi@example.com', buyerPhone: '+6281234567890' };
    expect(checkoutDtoSchema.parse({ ...base, productIds: [productId, other, productId] }).productIds).toEqual([productId, other]);
    expect(checkoutDtoSchema.safeParse({ ...base, productIds: [] }).success).toBe(false);
    expect(checkoutDtoSchema.safeParse({ ...base, productIds: Array(21).fill(productId) }).success).toBe(false);
  });

  it.each([
    ['non-uuid product', { productId: 'abc', buyerName: 'Budi', buyerEmail: 'budi@example.com' }],
    ['short name', { productId, buyerName: 'B', buyerEmail: 'budi@example.com' }],
    ['invalid email', { productId, buyerName: 'Budi', buyerEmail: 'budi@', buyerPhone: '081234567890' }],
    ['missing phone', { productId, buyerName: 'Budi', buyerEmail: 'budi@example.com' }],
    ['landline phone', { productId, buyerName: 'Budi', buyerEmail: 'budi@example.com', buyerPhone: '0215551234' }],
    ['missing email', { productId, buyerName: 'Budi' }],
    ['client-supplied price is ignored, not trusted', null],
  ])('checkout: rejects %s', (_label, input) => {
    if (input === null) {
      const parsed = checkoutDtoSchema.parse({ productId, buyerName: 'Budi', buyerEmail: 'b@example.com', buyerPhone: '081234567890', amount: 1 });
      expect(parsed).not.toHaveProperty('amount');
      return;
    }
    expect(checkoutDtoSchema.safeParse(input).success).toBe(false);
  });

  it('product: rejects negative price, non-integer price and non-URL thumbnail', () => {
    const base = { title: 'Template', description: 'Deskripsi produk panjang', price: 1000, thumbnail_url: 'https://x.test/a.png', delivery_url: 'https://drive.google.com/file/d/abc' };
    expect(createProductDtoSchema.safeParse(base).success).toBe(true);
    expect(createProductDtoSchema.safeParse({ ...base, price: -1 }).success).toBe(false);
    expect(createProductDtoSchema.safeParse({ ...base, price: 10.5 }).success).toBe(false);
    expect(createProductDtoSchema.safeParse({ ...base, thumbnail_url: 'uploads/a.png' }).success).toBe(false);
    expect(createProductDtoSchema.safeParse({ ...base, delivery_url: 'javascript:alert(1)' }).success).toBe(false);
    expect(createProductDtoSchema.safeParse({ ...base, delivery_url: undefined }).success).toBe(false);
  });

  it('link: rejects invalid URL', () => {
    expect(createLinkDtoSchema.safeParse({ title: 'GitHub', url: 'not a url' }).success).toBe(false);
  });

  it('profile: rejects javascript: URLs and bad hex colors', () => {
    expect(updateProfileDtoSchema.safeParse({ instagram_url: 'javascript:alert(1)' }).success).toBe(false);
    expect(updateProfileDtoSchema.safeParse({ theme_color: 'red' }).success).toBe(false);
    expect(updateProfileDtoSchema.parse({ theme_color: '' }).theme_color).toBeNull();
  });

  it('doku notification: rejects unknown transaction status', () => {
    expect(
      dokuNotificationDtoSchema.safeParse({ order: { invoice_number: 'INV-1' }, transaction: { status: 'REFUNDED' } }).success,
    ).toBe(false);
  });
});

describe('POST /api/checkout input', () => {
  it('returns 400 for an invalid email', async () => {
    const res = await app.request('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.1.0.1' },
      body: JSON.stringify({ productId, buyerName: 'Budi', buyerEmail: 'bukan-email' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('order status transitions', () => {
  const orderWith = (status: OrderStatus) =>
    ({ invoice_id: 'INV-1', amount: 25000, status, buyer_email: 'b@example.com', buyer_name: 'B', product: { title: 'P', file_path: 'p.zip' } }) as Order;
  const note = (status: 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'PENDING') => ({
    order: { invoice_number: 'INV-1', amount: 25000 },
    transaction: { status },
  });

  it.each([
    ['FAILED', 'FAILED'],
    ['EXPIRED', 'EXPIRED'],
    ['PENDING', 'PENDING'],
  ] as const)('PENDING + %s notification -> %s', async (dokuStatus, expected) => {
    vi.spyOn(orderRepository, 'getOrderByInvoiceId').mockResolvedValue(orderWith('PENDING'));
    const update = vi.spyOn(orderRepository, 'updateOrderStatus').mockResolvedValue(orderWith(expected));
    const result = await fulfillmentService.processNotification(note(dokuStatus));
    expect(update).toHaveBeenCalledWith('INV-1', expected, undefined);
    expect(result.status).toBe(expected);
  });

  it('PAID order ignores a late FAILED notification', async () => {
    vi.spyOn(orderRepository, 'getOrderByInvoiceId').mockResolvedValue(orderWith('PAID'));
    const update = vi.spyOn(orderRepository, 'updateOrderStatus');
    const result = await fulfillmentService.processNotification(note('FAILED'));
    expect(update).not.toHaveBeenCalled();
    expect(result.status).toBe('PAID');
  });

  it('FAILED/EXPIRED order is not resurrected to PAID and nothing is delivered', async () => {
    vi.spyOn(orderRepository, 'getOrderByInvoiceId').mockResolvedValue(orderWith('EXPIRED'));
    vi.spyOn(orderRepository, 'claimPayment').mockResolvedValue(null);
    const claimFulfillment = vi.spyOn(orderRepository, 'claimFulfillment');
    const send = vi.spyOn(resendAdapter, 'sendProductDeliveryEmail');
    const result = await fulfillmentService.processNotification(note('SUCCESS'));
    expect(result.status).toBe('EXPIRED');
    expect(claimFulfillment).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});

describe('admin endpoints without authentication', () => {
  const id = '22222222-2222-4222-8222-222222222222';
  it.each([
    ['GET', '/api/admin/analytics'],
    ['GET', '/api/admin/products'],
    ['GET', `/api/admin/products/${id}`],
    ['POST', '/api/admin/products'],
    ['PUT', `/api/admin/products/${id}`],
    ['DELETE', `/api/admin/products/${id}`],
    ['GET', '/api/admin/links'],
    ['POST', '/api/admin/links'],
    ['PUT', '/api/admin/links/reorder'],
    ['PUT', `/api/admin/links/${id}`],
    ['DELETE', `/api/admin/links/${id}`],
    ['GET', '/api/admin/profile'],
    ['PUT', `/api/admin/profile/${id}`],
    ['GET', '/api/admin/orders'],
    ['POST', '/api/admin/storage/upload-url'],
  ])('%s %s -> 401', async (method, path) => {
    const res = await app.request(path, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : '{}' });
    expect(res.status).toBe(401);
  });

  it('rejects a malformed bearer header', async () => {
    const res = await app.request('/api/admin/orders', { headers: { Authorization: 'Basic abc' } });
    expect(res.status).toBe(401);
  });
});

describe('catalog outage', () => {
  it('returns 500 instead of an empty storefront when the DB fails', async () => {
    const { productRepository } = await import('@/repositories/product.repository');
    const { profileRepository } = await import('@/repositories/profile.repository');
    const { linkRepository } = await import('@/repositories/link.repository');
    vi.spyOn(profileRepository, 'getProfile').mockResolvedValue(null);
    vi.spyOn(linkRepository, 'getActiveLinks').mockResolvedValue([]);
    vi.spyOn(productRepository, 'getActiveProducts').mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await app.request('/api/catalog');
    expect(res.status).toBe(500);
  });

  it('returns 503 DATABASE_UNAVAILABLE when Supabase is unreachable', async () => {
    const { productRepository } = await import('@/repositories/product.repository');
    const { profileRepository } = await import('@/repositories/profile.repository');
    const { linkRepository } = await import('@/repositories/link.repository');
    vi.spyOn(profileRepository, 'getProfile').mockRejectedValue(new Error('ProfileRepository.getProfile failed: TypeError: fetch failed'));
    vi.spyOn(linkRepository, 'getActiveLinks').mockResolvedValue([]);
    vi.spyOn(productRepository, 'getActiveProducts').mockResolvedValue([]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await app.request('/api/catalog');
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(503);
    expect(body.error.code).toBe('DATABASE_UNAVAILABLE');
  });
});
