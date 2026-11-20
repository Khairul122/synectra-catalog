import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '@/app';
import { checkoutService } from '@/services/checkout.service';
import { fulfillmentService } from '@/services/fulfillment.service';
import { productRepository } from '@/repositories/product.repository';
import { profileRepository } from '@/repositories/profile.repository';
import { linkRepository } from '@/repositories/link.repository';
import { catalogService } from '@/services/catalog.service';
import { adminService } from '@/services/admin.service';
import { orderRepository } from '@/repositories/order.repository';
import { storageRepository } from '@/repositories/storage.repository';
import { dokuAdapter } from '@/infrastructure/doku.adapter';
import { resendAdapter } from '@/infrastructure/resend.adapter';
import type { Order } from '@/types';

const productId = '11111111-1111-4111-8111-111111111111';
const product = { id: productId, title: 'Asset', price: 25000, file_path: 'asset.zip', is_active: true };
const order = { invoice_id: 'INV-1', buyer_name: 'Buyer', buyer_email: 'buyer@example.com', product_id: productId, amount: 25000, status: 'PENDING', product } as Order;
const notification = { order: { invoice_number: 'INV-1', amount: 25000 }, transaction: { status: 'SUCCESS' as const, reference_id: 'REF-1' } };

beforeEach(() => {
  vi.restoreAllMocks();
  // Checkout reads the active payment method from the profile; default store = DOKU.
  vi.spyOn(profileRepository, 'getProfile').mockResolvedValue(null);
});

describe('payment flow', () => {
  it('uses database price and starts PENDING', async () => {
    vi.spyOn(productRepository, 'getProductById').mockResolvedValue(product as never);
    const create = vi.spyOn(orderRepository, 'createOrder').mockResolvedValue(order);
    vi.spyOn(orderRepository, 'setPaymentDetails').mockResolvedValue(undefined);
    vi.spyOn(dokuAdapter, 'createCheckout').mockResolvedValue({ paymentUrl: 'https://example.com/pay', referenceId: 'REF-1', invoiceId: 'INV-1' });
    const result = await checkoutService.initiateCheckout({ productIds: [productId], buyerName: 'Buyer', buyerEmail: 'buyer@example.com', buyerPhone: '6281234567890' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ amount: 25000, status: 'PENDING' }), [{ product_id: productId, price: 25000 }]);
    expect(result.amount).toBe(25000);
  });

  it('charges the database total of every cart product and sends one DOKU line per product', async () => {
    const second = { ...product, id: '22222222-2222-4222-8222-222222222222', title: 'Second', price: 10000 };
    vi.spyOn(productRepository, 'getProductById').mockImplementation(async (id) => (id === productId ? product : second) as never);
    const create = vi.spyOn(orderRepository, 'createOrder').mockResolvedValue({ ...order, amount: 35000 });
    vi.spyOn(orderRepository, 'setPaymentDetails').mockResolvedValue(undefined);
    const doku = vi.spyOn(dokuAdapter, 'createCheckout').mockResolvedValue({ paymentUrl: 'https://example.com/pay', referenceId: 'R', invoiceId: 'x' });
    const result = await checkoutService.initiateCheckout({ productIds: [productId, second.id], buyerName: 'Buyer', buyerEmail: 'buyer@example.com', buyerPhone: '6281234567890' });
    expect(result.amount).toBe(35000);
    expect(create.mock.calls[0][1]).toEqual([{ product_id: productId, price: 25000 }, { product_id: second.id, price: 10000 }]);
    expect(doku).toHaveBeenCalledWith(expect.objectContaining({ amount: 35000, lineItems: [{ name: 'Asset', price: 25000 }, { name: 'Second', price: 10000 }] }));
  });

  it('delivers one signed link per order item in a single email', async () => {
    const second = { ...product, id: 'p2', title: 'Second', file_path: 'second.zip' };
    const cartOrder = { ...order, items: [{ price: 25000, product }, { price: 10000, product: second }] } as Order;
    vi.spyOn(orderRepository, 'getOrderByInvoiceId').mockResolvedValue(cartOrder);
    vi.spyOn(orderRepository, 'claimPayment').mockResolvedValue({ ...cartOrder, status: 'PAID' });
    vi.spyOn(orderRepository, 'claimFulfillment').mockResolvedValue(true);
    vi.spyOn(orderRepository, 'markFulfillmentSent').mockResolvedValue(undefined);
    vi.spyOn(storageRepository, 'createSignedUrl').mockImplementation(async (_b, path) => `https://example.com/${path}`);
    const send = vi.spyOn(resendAdapter, 'sendProductDeliveryEmail').mockResolvedValue({ id: 'ok' });
    await fulfillmentService.processNotification(notification);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].downloads).toEqual([
      { title: 'Asset', url: 'https://example.com/asset.zip' },
      { title: 'Second', url: 'https://example.com/second.zip' },
    ]);
  });

  it('records payment creation failure without marking paid', async () => {
    vi.spyOn(productRepository, 'getProductById').mockResolvedValue(product as never);
    vi.spyOn(orderRepository, 'createOrder').mockResolvedValue(order);
    vi.spyOn(dokuAdapter, 'createCheckout').mockRejectedValue(new Error('provider unavailable'));
    const record = vi.spyOn(orderRepository, 'recordPaymentError').mockResolvedValue(undefined);
    await expect(checkoutService.initiateCheckout({ productIds: [productId], buyerName: 'Buyer', buyerEmail: 'buyer@example.com', buyerPhone: '6281234567890' })).rejects.toThrow('provider unavailable');
    expect(record).toHaveBeenCalledWith('INV-1', expect.stringContaining('provider unavailable'));
  });

  it('rejects unsigned webhook even with simulation header', async () => {
    const response = await app.request('/api/webhooks/doku', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-doku-simulation': 'true' }, body: JSON.stringify(notification) });
    expect(response.status).toBe(400);
  });

  it('accepts signed webhook and rejects altered body and stale timestamp', async () => {
    vi.spyOn(orderRepository, 'getOrderByInvoiceId').mockResolvedValue(order);
    vi.spyOn(orderRepository, 'claimPayment').mockResolvedValue({ ...order, status: 'PAID' });
    vi.spyOn(orderRepository, 'claimFulfillment').mockResolvedValue(true);
    vi.spyOn(orderRepository, 'markFulfillmentSent').mockResolvedValue(undefined);
    vi.spyOn(storageRepository, 'createSignedUrl').mockResolvedValue('https://example.com/asset');
    const send = vi.spyOn(resendAdapter, 'sendProductDeliveryEmail').mockResolvedValue({ id: 'simulated' });
    const body = JSON.stringify(notification);
    const request = (payload: string, timestamp: string) => app.request('/api/webhooks/doku', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Client-Id': 'MALL-ID-DEMO', 'Request-Id': 'REQ-1', 'Request-Timestamp': timestamp, Signature: dokuAdapter.generateSignature('REQ-1', timestamp, '/api/webhooks/doku', dokuAdapter.generateDigest(body)) }, body: payload,
    });
    expect((await request(body.replace('25000', '1'), new Date().toISOString())).status).toBe(403);
    expect((await request(body, new Date(0).toISOString())).status).toBe(403);
    expect((await request(body, new Date().toISOString())).status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('fulfills once for concurrent notifications and uses 24-hour URL', async () => {
    vi.spyOn(orderRepository, 'getOrderByInvoiceId').mockResolvedValue(order);
    vi.spyOn(orderRepository, 'claimPayment').mockResolvedValueOnce({ ...order, status: 'PAID' }).mockResolvedValueOnce(null);
    vi.spyOn(orderRepository, 'claimFulfillment').mockResolvedValueOnce(true);
    vi.spyOn(orderRepository, 'markFulfillmentSent').mockResolvedValue(undefined);
    const signed = vi.spyOn(storageRepository, 'createSignedUrl').mockResolvedValue('https://example.com/asset');
    const send = vi.spyOn(resendAdapter, 'sendProductDeliveryEmail').mockResolvedValue({ id: 'simulated' });
    await Promise.all([fulfillmentService.processNotification(notification), fulfillmentService.processNotification(notification)]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(signed).toHaveBeenCalledWith('private-products', 'asset.zip', 86400);
  });

  it('rejects mismatched amount and records storage or email failure', async () => {
    vi.spyOn(orderRepository, 'getOrderByInvoiceId').mockResolvedValue(order);
    const claim = vi.spyOn(orderRepository, 'claimPayment').mockResolvedValue({ ...order, status: 'PAID' });
    await expect(fulfillmentService.processNotification({ ...notification, order: { ...notification.order, amount: 1 } })).rejects.toThrow();
    expect(claim).not.toHaveBeenCalled();
    vi.spyOn(orderRepository, 'claimFulfillment').mockResolvedValue(true);
    const record = vi.spyOn(orderRepository, 'recordFulfillmentError').mockResolvedValue(undefined);
    vi.spyOn(storageRepository, 'createSignedUrl').mockRejectedValueOnce(new Error('storage down')).mockResolvedValue('https://example.com/asset');
    await expect(fulfillmentService.processNotification(notification)).rejects.toThrow('storage down');
    expect(record).toHaveBeenCalledWith('INV-1', 'storage', expect.stringContaining('storage down'));
    vi.spyOn(resendAdapter, 'sendProductDeliveryEmail').mockRejectedValue(new Error('email down'));
    await expect(fulfillmentService.processNotification(notification)).rejects.toThrow('email down');
    expect(record).toHaveBeenCalledWith('INV-1', 'email', expect.stringContaining('email down'));
  });

  it('retry after failed email re-sends for an already PAID order', async () => {
    const paid = { ...order, status: 'PAID' } as Order;
    vi.spyOn(orderRepository, 'getOrderByInvoiceId').mockResolvedValue(paid);
    vi.spyOn(orderRepository, 'claimPayment').mockResolvedValue(null);
    vi.spyOn(orderRepository, 'claimFulfillment').mockResolvedValue(true);
    const sent = vi.spyOn(orderRepository, 'markFulfillmentSent').mockResolvedValue(undefined);
    vi.spyOn(storageRepository, 'createSignedUrl').mockResolvedValue('https://example.com/asset');
    const send = vi.spyOn(resendAdapter, 'sendProductDeliveryEmail').mockResolvedValue({ id: 'ok' });
    const result = await fulfillmentService.processNotification(notification);
    expect(result.emailSent).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(sent).toHaveBeenCalledWith('INV-1');
  });

  it('acknowledges repeated non-success notifications without throwing', async () => {
    vi.spyOn(orderRepository, 'getOrderByInvoiceId').mockResolvedValue({ ...order, status: 'FAILED' } as Order);
    const update = vi.spyOn(orderRepository, 'updateOrderStatus');
    const failed = { ...notification, transaction: { status: 'FAILED' as const } };
    await expect(fulfillmentService.processNotification(failed)).resolves.toMatchObject({ status: 'FAILED' });
    expect(update).not.toHaveBeenCalled();
  });

  it('sends DOKU timestamp without millis and redirects to the order page', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ response: { payment: { url: 'https://doku.test/pay' } } }), { status: 200 }),
    );
    await dokuAdapter.createCheckout({ invoiceId: 'INV-9', amount: 1000, buyerName: 'B', buyerEmail: 'b@example.com', productTitle: 'P' });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['Request-Timestamp']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(JSON.parse(init.body as string).order.callback_url).toMatch(/\/order\/INV-9$/);
  });

  it('generates unguessable invoice ids', async () => {
    vi.spyOn(productRepository, 'getProductById').mockResolvedValue(product as never);
    const create = vi.spyOn(orderRepository, 'createOrder').mockImplementation(async (p) => ({ ...order, invoice_id: p.invoice_id }));
    vi.spyOn(orderRepository, 'setPaymentDetails').mockResolvedValue(undefined);
    vi.spyOn(dokuAdapter, 'createCheckout').mockResolvedValue({ paymentUrl: 'https://example.com/pay', referenceId: 'R', invoiceId: 'x' });
    await checkoutService.initiateCheckout({ productIds: [productId], buyerName: 'Buyer', buyerEmail: 'buyer@example.com', buyerPhone: '6281234567890' });
    expect(create.mock.calls[0][0].invoice_id).toMatch(/^INV-\d+-[0-9a-f]{16}$/);
  });
});

describe('lost webhook fallback', () => {
  it('marks a pending order paid when DOKU Check Status says SUCCESS', async () => {
    vi.spyOn(dokuAdapter, 'getOrderStatus').mockResolvedValue({ status: 'SUCCESS', amount: 25000 });
    const process = vi.spyOn(fulfillmentService, 'processNotification').mockResolvedValue({ invoiceId: 'INV-1', status: 'PAID', emailSent: true, downloadUrlGenerated: true });
    await fulfillmentService.syncPendingOrder(order);
    expect(process).toHaveBeenCalledWith({ order: { invoice_number: 'INV-1', amount: 25000 }, transaction: { status: 'SUCCESS' } });
  });

  it('leaves the order alone while DOKU still reports pending', async () => {
    vi.spyOn(dokuAdapter, 'getOrderStatus').mockResolvedValue({ status: 'PENDING' });
    const process = vi.spyOn(fulfillmentService, 'processNotification');
    await fulfillmentService.syncPendingOrder(order);
    expect(process).not.toHaveBeenCalled();
  });
});

describe('link delivery', () => {
  it('hands out the product link for paid orders and hides it from the catalog', async () => {
    const linkProduct = { ...product, file_path: null, delivery_url: 'https://drive.google.com/file/d/abc' };
    vi.spyOn(orderRepository, 'getOrderByInvoiceId').mockResolvedValue({ ...order, status: 'PAID', product: linkProduct } as Order);
    const links = await fulfillmentService.getDownloadLinksForOrder('INV-1');
    expect(links[0].url).toBe('https://drive.google.com/file/d/abc');

    vi.spyOn(productRepository, 'getActiveProducts').mockResolvedValue([linkProduct] as never);
    vi.spyOn(profileRepository, 'getProfile').mockResolvedValue(null);
    vi.spyOn(linkRepository, 'getActiveLinks').mockResolvedValue([]);
    const body = JSON.stringify(await catalogService.getCatalog());
    expect(body).not.toContain('drive.google.com');
    expect(body).not.toContain('file_path');
  });
});

describe('manual QRIS payment', () => {
  const manualDto = { productIds: [productId], buyerName: 'Buyer', buyerEmail: 'buyer@example.com', buyerPhone: '6281234567890' };

  it('ignores a buyer-supplied method: the store mode decides', async () => {
    vi.spyOn(productRepository, 'getProductById').mockResolvedValue(product as never);
    const create = vi.spyOn(orderRepository, 'createOrder').mockResolvedValue(order);
    vi.spyOn(orderRepository, 'setPaymentDetails').mockResolvedValue();
    vi.spyOn(dokuAdapter, 'createCheckout').mockResolvedValue({ paymentUrl: 'https://pay', referenceId: 'R', invoiceId: 'x' });
    await checkoutService.initiateCheckout({ ...manualDto, paymentMethod: 'QRIS_MANUAL' } as never);
    expect(create.mock.calls[0][0].payment_method).toBe('DOKU');
  });

  it('refuses switching the store to QRIS without a QR image and WhatsApp number', async () => {
    vi.spyOn(profileRepository, 'getProfile').mockResolvedValue({ qris_image_url: null, whatsapp_number: '6281111111111' } as never);
    const update = vi.spyOn(profileRepository, 'updateProfile');
    await expect(adminService.updateProfile('id', { payment_mode: 'QRIS_MANUAL' })).rejects.toThrow('QRIS');
    expect(update).not.toHaveBeenCalled();
  });

  it('creates the order without calling DOKU', async () => {
    vi.spyOn(productRepository, 'getProductById').mockResolvedValue(product as never);
    vi.spyOn(profileRepository, 'getProfile').mockResolvedValue({ payment_mode: 'QRIS_MANUAL', qris_image_url: 'https://x.test/qr.png', whatsapp_number: '6281111111111' } as never);
    const create = vi.spyOn(orderRepository, 'createOrder').mockResolvedValue({ ...order, payment_method: 'QRIS_MANUAL' } as Order);
    const doku = vi.spyOn(dokuAdapter, 'createCheckout');
    const result = await checkoutService.initiateCheckout(manualDto);
    expect(result.paymentUrl).toBeNull();
    expect(doku).not.toHaveBeenCalled();
    expect(create.mock.calls[0][0].payment_method).toBe('QRIS_MANUAL');
  });

  it('refuses manual checkout until the store has a QR image and WhatsApp number', async () => {
    vi.spyOn(productRepository, 'getProductById').mockResolvedValue(product as never);
    vi.spyOn(profileRepository, 'getProfile').mockResolvedValue({ payment_mode: 'QRIS_MANUAL', qris_image_url: null, whatsapp_number: null } as never);
    const create = vi.spyOn(orderRepository, 'createOrder');
    await expect(checkoutService.initiateCheckout(manualDto)).rejects.toThrow('tidak tersedia');
    expect(create).not.toHaveBeenCalled();
  });

  it('admin confirmation runs the normal paid flow, only for manual orders', async () => {
    const process = vi.spyOn(fulfillmentService, 'processNotification').mockResolvedValue({ invoiceId: 'INV-1', status: 'PAID', emailSent: true, downloadUrlGenerated: true });
    vi.spyOn(orderRepository, 'getOrderByInvoiceId').mockResolvedValue({ ...order, payment_method: 'QRIS_MANUAL' } as Order);
    await fulfillmentService.confirmManualPayment('INV-1');
    expect(process).toHaveBeenCalledWith({ order: { invoice_number: 'INV-1', amount: 25000 }, transaction: { status: 'SUCCESS', reference_id: 'QRIS-MANUAL' } });

    vi.spyOn(orderRepository, 'getOrderByInvoiceId').mockResolvedValue({ ...order, payment_method: 'DOKU' } as Order);
    await expect(fulfillmentService.confirmManualPayment('INV-1')).rejects.toThrow('QRIS manual');
  });

  it('never asks DOKU about manual orders', async () => {
    const status = vi.spyOn(dokuAdapter, 'getOrderStatus');
    await fulfillmentService.syncPendingOrder({ ...order, payment_method: 'QRIS_MANUAL' } as Order);
    expect(status).not.toHaveBeenCalled();
  });
});
