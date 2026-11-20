import { orderRepository } from '../repositories/order.repository';
import { storageRepository } from '../repositories/storage.repository';
import { resendAdapter } from '../infrastructure/resend.adapter';
import { dokuAdapter } from '../infrastructure/doku.adapter';
import type { DokuNotificationDto } from '../dtos';
import type { Order, OrderStatus, Product } from '../types';

const SIGNED_URL_EXPIRES_IN = 86400;

export interface FulfillmentResult {
  invoiceId: string;
  status: OrderStatus;
  emailSent: boolean;
  downloadUrlGenerated: boolean;
}

export class FulfillmentService {
  async processNotification(dto: DokuNotificationDto): Promise<FulfillmentResult> {
    const invoiceId = dto.order.invoice_number;
    const dokuStatus = dto.transaction.status;
    const dokuReference = dto.transaction.reference_id;
    const order = await orderRepository.getOrderByInvoiceId(invoiceId);

    if (!order) {
      throw new Error(`Order invoice ${invoiceId} tidak ditemukan.`);
    }

    if (dto.order.amount !== undefined && dto.order.amount !== order.amount) {
      throw new Error(`Jumlah pembayaran order ${invoiceId} tidak sesuai.`);
    }

    if (dokuStatus !== 'SUCCESS') {
      // Only PENDING orders can transition; repeated/late notifications are acknowledged as-is.
      if (order.status !== 'PENDING') {
        return { invoiceId, status: order.status, emailSent: false, downloadUrlGenerated: false };
      }

      const mappedStatus: OrderStatus = dokuStatus === 'FAILED' ? 'FAILED' : dokuStatus === 'EXPIRED' ? 'EXPIRED' : 'PENDING';
      const updatedOrder = await orderRepository.updateOrderStatus(invoiceId, mappedStatus, dokuReference);
      return { invoiceId, status: updatedOrder.status, emailSent: false, downloadUrlGenerated: false };
    }

    // Already-PAID orders fall through so a retry can finish a previously failed fulfillment;
    // claimFulfillment below is the single guard against double delivery.
    const paidOrder =
      (await orderRepository.claimPayment(invoiceId, dokuReference)) ??
      (await orderRepository.getOrderByInvoiceId(invoiceId));
    if (!paidOrder || paidOrder.status !== 'PAID') {
      return { invoiceId, status: paidOrder?.status ?? order.status, emailSent: false, downloadUrlGenerated: false };
    }

    const claimed = await orderRepository.claimFulfillment(invoiceId);
    if (!claimed) {
      return { invoiceId, status: 'PAID', emailSent: false, downloadUrlGenerated: false };
    }

    const products = orderProducts(paidOrder);
    if (products.length === 0) {
      await orderRepository.recordFulfillmentError(invoiceId, 'storage', 'Produk order tidak ditemukan.').catch((error) => {
        console.error('[Fulfillment Error Record]', error);
      });
      throw new Error(`Produk untuk order ${invoiceId} tidak ditemukan.`);
    }

    let downloads: Array<{ title: string; url: string }>;
    try {
      downloads = await Promise.all(
        products.map(async (product) => ({
          title: product.title,
          url: await deliveryUrl(product),
        })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal membuat signed URL';
      await orderRepository.recordFulfillmentError(invoiceId, 'storage', message).catch((recordError) => {
        console.error('[Fulfillment Error Record]', recordError);
      });
      throw error;
    }

    try {
      await resendAdapter.sendProductDeliveryEmail({
        to: paidOrder.buyer_email,
        buyerName: paidOrder.buyer_name,
        invoiceId: paidOrder.invoice_id,
        downloads,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mengirim email fulfillment';
      await orderRepository.recordFulfillmentError(invoiceId, 'email', message).catch((recordError) => {
        console.error('[Fulfillment Error Record]', recordError);
      });
      throw error;
    }

    await orderRepository.markFulfillmentSent(invoiceId);
    return { invoiceId, status: 'PAID', emailSent: true, downloadUrlGenerated: true };
  }

  /**
   * Fallback for lost webhooks: ask DOKU about a PENDING order and apply the answer exactly like a notification.
   * ponytail: called on every status poll of a pending order (5s while the page is open); cache/throttle if DOKU rate-limits.
   */
  async syncPendingOrder(order: Order): Promise<void> {
    if (order.status !== 'PENDING') return;
    try {
      const doku = await dokuAdapter.getOrderStatus(order.invoice_id);
      if (!doku || doku.status === 'PENDING') return;
      await this.processNotification({
        order: { invoice_number: order.invoice_id, amount: doku.amount },
        transaction: { status: doku.status },
      });
    } catch (error) {
      // Status is already PAID before email/storage can fail, so the buyer still sees the payment.
      console.error('[doku-sync]', order.invoice_id, error instanceof Error ? error.message : error);
    }
  }

  async getDownloadLinksForOrder(invoiceId: string): Promise<Array<{ productId: string; title: string; url: string }>> {
    const order = await orderRepository.getOrderByInvoiceId(invoiceId);
    const products = order ? orderProducts(order) : [];
    if (!order || order.status !== 'PAID' || products.length === 0) {
      throw new Error('Akses unduhan ditolak: Pesanan belum lunas atau tidak valid.');
    }

    return Promise.all(
      products.map(async (product) => ({
        productId: product.id,
        title: product.title,
        url: await deliveryUrl(product),
      })),
    );
  }
}

/** Link products hand out their URL as-is; legacy file products get a short-lived signed URL. */
async function deliveryUrl(product: Product): Promise<string> {
  if (product.delivery_url) return product.delivery_url;
  if (product.file_path) return storageRepository.createSignedUrl('private-products', product.file_path, SIGNED_URL_EXPIRES_IN);
  throw new Error(`Produk ${product.id} belum punya tautan.`);
}

/** Products bought in an order: its line items, or the single product of pre-cart orders. */
export function orderProducts(order: Order): Product[] {
  if (order.items?.length) return order.items.map((item) => item.product).filter(Boolean);
  return order.product ? [order.product] : [];
}

export const fulfillmentService = new FulfillmentService();
