import { randomBytes } from 'node:crypto';
import { productRepository } from '../repositories/product.repository';
import { orderRepository, DuplicateOrderError } from '../repositories/order.repository';
import { dokuAdapter } from '../infrastructure/doku.adapter';
import { profileRepository } from '../repositories/profile.repository';
import type { CheckoutDto } from '../dtos';
import type { Order } from '../types';

export interface CheckoutResult {
  invoiceId: string;
  amount: number;
  /** Null for manual QRIS: the buyer pays from the order page. */
  paymentUrl: string | null;
  productTitle: string;
}

/** Errors whose message is safe to show the buyer. Anything else is logged and masked. */
export class CheckoutError extends Error {
  constructor(message: string, public status: 400 | 409 = 400) {
    super(message);
  }
}

export class CheckoutService {
  async initiateCheckout(dto: CheckoutDto, idempotencyKey?: string): Promise<CheckoutResult> {
    if (idempotencyKey) {
      const existing = await orderRepository.getOrderByIdempotencyKey(idempotencyKey);
      if (existing) return this.replay(existing, dto);
    }

    // ponytail: one lookup per product (cart max 20); batch with `.in()` if carts grow.
    const products = await Promise.all(dto.productIds.map((id) => productRepository.getProductById(id)));
    if (products.some((product) => !product || !product.is_active)) {
      throw new CheckoutError('Produk tidak ditemukan atau sedang dinonaktifkan.');
    }
    const items = products as NonNullable<(typeof products)[number]>[];

    const manual = dto.paymentMethod === 'QRIS_MANUAL';
    if (manual) {
      const profile = await profileRepository.getProfile();
      if (!profile?.qris_image_url || !profile.whatsapp_number) {
        throw new CheckoutError('Pembayaran QRIS belum tersedia. Silakan pilih metode lain.');
      }
    }

    // Security: prices come solely from the database product records, never from the client request
    const price = items.reduce((sum, product) => sum + product.price, 0);
    const productTitle = items.length === 1 ? items[0].title : `${items[0].title} + ${items.length - 1} produk lainnya`;
    // Unguessable: the invoice id is the only key for the public order/download endpoints.
    const invoiceId = `INV-${Date.now()}-${randomBytes(8).toString('hex')}`;

    let order: Order;
    try {
      order = await orderRepository.createOrder({
        invoice_id: invoiceId,
        buyer_name: dto.buyerName,
        buyer_email: dto.buyerEmail,
        buyer_phone: dto.buyerPhone,
        payment_method: dto.paymentMethod,
        product_id: items[0].id,
        amount: price,
        status: 'PENDING',
        doku_reference: null,
        idempotency_key: idempotencyKey ?? null,
      }, items.map((product) => ({ product_id: product.id, price: product.price })));
    } catch (error) {
      // Concurrent request with the same key won the insert race.
      if (error instanceof DuplicateOrderError && idempotencyKey) {
        const existing = await orderRepository.getOrderByIdempotencyKey(idempotencyKey);
        if (existing) return this.replay(existing, dto);
      }
      throw error;
    }

    if (manual) {
      // No gateway: the admin confirms the transfer over WhatsApp and marks the order paid.
      return { invoiceId: order.invoice_id, amount: price, paymentUrl: null, productTitle };
    }

    let paymentResult;
    try {
      paymentResult = await dokuAdapter.createCheckout({
        invoiceId: order.invoice_id,
        amount: price,
        buyerName: dto.buyerName,
        buyerEmail: dto.buyerEmail,
        buyerPhone: dto.buyerPhone,
        productTitle,
        lineItems: items.map((product) => ({ name: product.title, price: product.price })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'DOKU checkout gagal';
      await orderRepository.recordPaymentError(order.invoice_id, message).catch((recordError) => {
        console.error('[Payment Error Record]', recordError instanceof Error ? recordError.message : recordError);
      });
      throw error;
    }

    await orderRepository.setPaymentDetails(order.invoice_id, paymentResult.paymentUrl, paymentResult.referenceId);

    return {
      invoiceId: order.invoice_id,
      amount: price,
      paymentUrl: paymentResult.paymentUrl,
      productTitle,
    };
  }

  private replay(existing: Order, dto: CheckoutDto): CheckoutResult {
    const existingIds = existing.items?.map((item) => item.product.id) ?? [existing.product_id];
    const sameCart = [...existingIds].sort().join() === [...dto.productIds].sort().join();
    if (!sameCart || existing.buyer_email !== dto.buyerEmail) {
      throw new CheckoutError('Idempotency-Key sudah dipakai untuk checkout lain.', 409);
    }
    if (!existing.payment_url && existing.payment_method !== 'QRIS_MANUAL') {
      throw new CheckoutError('Checkout sebelumnya masih diproses atau gagal. Coba lagi sebentar.', 409);
    }
    return {
      invoiceId: existing.invoice_id,
      amount: existing.amount,
      paymentUrl: existing.payment_url,
      productTitle: existing.product?.title ?? '',
    };
  }

  async getOrder(invoiceId: string): Promise<Order | null> {
    return orderRepository.getOrderByInvoiceId(invoiceId);
  }
}

export const checkoutService = new CheckoutService();
