import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '@/app';
import { checkoutService } from '@/services/checkout.service';
import { fulfillmentService } from '@/services/fulfillment.service';
import { productRepository } from '@/repositories/product.repository';
import { orderRepository } from '@/repositories/order.repository';
import { storageRepository } from '@/repositories/storage.repository';
import { dokuAdapter } from '@/infrastructure/doku.adapter';
import { resendAdapter } from '@/infrastructure/resend.adapter';
import type { Order } from '@/types';

const productId = '11111111-1111-4111-8111-111111111111';
const product = { id: productId, title: 'Asset', price: 25000, file_path: 'asset.zip', is_active: true };
const order = { invoice_id: 'INV-1', buyer_name: 'Buyer', buyer_email: 'buyer@example.com', product_id: productId, amount: 25000, status: 'PENDING', product } as Order;
const notification = { order: { invoice_number: 'INV-1', amount: 25000 }, transaction: { status: 'SUCCESS' as const, reference_id: 'REF-1' } };

beforeEach(() => vi.restoreAllMocks());

describe('payment flow', () => {
  it('uses database price and starts PENDING', async () => {
    vi.spyOn(productRepository, 'getProductById').mockResolvedValue(product as never);
    const create = vi.spyOn(orderRepository, 'createOrder').mockResolvedValue(order);
    vi.spyOn(orderRepository, 'setPaymentDetails').mockResolvedValue(undefined);
    vi.spyOn(dokuAdapter, 'createCheckout').mockResolvedValue({ paymentUrl: 'https://example.com/pay', referenceId: 'REF-1', invoiceId: 'INV-1' });
    const result = await checkoutService.initiateCheckout({ productIds: [productId], buyerName: 'Buyer', buyerEmail: 'buyer@example.com' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ amount: 25000, status: 'PENDING' }), [{ product_id: productId, price: 25000 }]);
    expect(result.amount).toBe(25000);
  });

  it('charges the database total of every cart product and sends one DOKU line per product', async () => {
    const second = { ...product, id: '22222222-2222-4222-8222-222222222222', title: 'Second', price: 10000 };
    vi.spyOn(productRepository, 'getProductById').mockImplementation(async (id) => (id === productId ? product : second) as never);
    const create = vi.spyOn(orderRepository, 'createOrder').mockResolvedValue({ ...order, amount: 35000 });
    vi.spyOn(orderRepository, 'setPaymentDetails').mockResolvedValue(undefined);
    const doku = vi.spyOn(dokuAdapter, 'createCheckout').mockResolvedValue({ paymentUrl: 'https://example.com/pay', referenceId: 'R', invoiceId: 'x' });
    const result = await checkoutService.initiateCheckout({ productIds: [productId, second.id], buyerName: 'Buyer', buyerEmail: 'buyer@example.com' });
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
    await expect(checkoutService.initiateCheckout({ productIds: [productId], buyerName: 'Buyer', buyerEmail: 'buyer@example.com' })).rejects.toThrow('provider unavailable');
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
    await checkoutService.initiateCheckout({ productIds: [productId], buyerName: 'Buyer', buyerEmail: 'buyer@example.com' });
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
