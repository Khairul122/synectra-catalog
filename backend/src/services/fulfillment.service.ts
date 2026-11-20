import { orderRepository } from '@/repositories/order.repository';
import { storageRepository } from '@/repositories/storage.repository';
import { resendAdapter } from '@/infrastructure/resend.adapter';
import type { DokuNotificationDto } from '@/dtos';
import type { OrderStatus } from '@/types';

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

    const product = paidOrder.product;
    if (!product) {
      await orderRepository.recordFulfillmentError(invoiceId, 'storage', 'Produk order tidak ditemukan.').catch((error) => {
        console.error('[Fulfillment Error Record]', error);
      });
      throw new Error(`Produk untuk order ${invoiceId} tidak ditemukan.`);
    }

    let signedUrl: string;
    try {
      signedUrl = await storageRepository.createSignedUrl(
        'private-products',
        product.file_path,
        SIGNED_URL_EXPIRES_IN,
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
        productTitle: product.title,
        invoiceId: paidOrder.invoice_id,
        signedDownloadUrl: signedUrl,
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

  async getDownloadLinkForOrder(invoiceId: string): Promise<string> {
    const order = await orderRepository.getOrderByInvoiceId(invoiceId);
    if (!order || order.status !== 'PAID' || !order.product) {
      throw new Error('Akses unduhan ditolak: Pesanan belum lunas atau tidak valid.');
    }

    return storageRepository.createSignedUrl(
      'private-products',
      order.product.file_path,
      SIGNED_URL_EXPIRES_IN,
    );
  }
}

export const fulfillmentService = new FulfillmentService();
