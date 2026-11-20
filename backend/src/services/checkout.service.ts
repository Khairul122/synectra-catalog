import { randomBytes } from 'node:crypto';
import { productRepository } from '@/repositories/product.repository';
import { orderRepository, DuplicateOrderError } from '@/repositories/order.repository';
import { dokuAdapter } from '@/infrastructure/doku.adapter';
import type { CheckoutDto } from '@/dtos';
import type { Order } from '@/types';

export interface CheckoutResult {
  invoiceId: string;
  amount: number;
  paymentUrl: string;
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

    const product = await productRepository.getProductById(dto.productId);

    if (!product || !product.is_active) {
      throw new CheckoutError('Produk tidak ditemukan atau sedang dinonaktifkan.');
    }

    // Security: Price is determined solely by the database product record, never from client request
    const price = product.price;
    // Unguessable: the invoice id is the only key for the public order/download endpoints.
    const invoiceId = `INV-${Date.now()}-${randomBytes(8).toString('hex')}`;

    let order: Order;
    try {
      order = await orderRepository.createOrder({
        invoice_id: invoiceId,
        buyer_name: dto.buyerName,
        buyer_email: dto.buyerEmail,
        product_id: product.id,
        amount: price,
        status: 'PENDING',
        doku_reference: null,
        idempotency_key: idempotencyKey ?? null,
      });
    } catch (error) {
      // Concurrent request with the same key won the insert race.
      if (error instanceof DuplicateOrderError && idempotencyKey) {
        const existing = await orderRepository.getOrderByIdempotencyKey(idempotencyKey);
        if (existing) return this.replay(existing, dto);
      }
      throw error;
    }

    let paymentResult;
    try {
      paymentResult = await dokuAdapter.createCheckout({
        invoiceId: order.invoice_id,
        amount: price,
        buyerName: dto.buyerName,
        buyerEmail: dto.buyerEmail,
        productTitle: product.title,
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
      productTitle: product.title,
    };
  }

  private replay(existing: Order, dto: CheckoutDto): CheckoutResult {
    if (existing.product_id !== dto.productId || existing.buyer_email !== dto.buyerEmail) {
      throw new CheckoutError('Idempotency-Key sudah dipakai untuk checkout lain.', 409);
    }
    if (!existing.payment_url) {
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
