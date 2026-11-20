import { supabaseAdmin } from '../infrastructure/supabase.admin';
import type { Order, OrderStatus } from '../types';

type OrderInsert = Omit<
  Order,
  'id' | 'created_at' | 'updated_at' | 'product' | 'fulfillment_state' | 'payment_error' | 'fulfillment_error' | 'payment_url' | 'idempotency_key'
> &
  Partial<Pick<Order, 'fulfillment_state' | 'payment_error' | 'fulfillment_error' | 'payment_url' | 'idempotency_key'>>;

// Every order read carries its line items; `product` is the first item (kept for older single-product code).
const ORDER_SELECT = '*, product:products(*), items:order_items(price, product:products(*))';

/** Thrown when an insert collides with an existing idempotency key. */
export class DuplicateOrderError extends Error {}

export interface OrderAnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  failedOrdersCount: number;
}

export class OrderRepository {
  async createOrder(payload: OrderInsert, items: Array<{ product_id: string; price: number }>): Promise<Order> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert(payload)
      .select('*')
      .single();

    if (error?.code === '23505' && payload.idempotency_key) {
      throw new DuplicateOrderError('Idempotency key already used');
    }
    if (error) {
      throw new Error(`OrderRepository.createOrder failed: ${error.message}`);
    }

    // ponytail: two inserts, not one transaction. A failed item insert leaves a PENDING order with no
    // payment URL (never payable, never delivered); move both into an RPC if that ever matters.
    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(items.map((item) => ({ ...item, order_id: data.id })));
    if (itemsError) {
      throw new Error(`OrderRepository.createOrder items failed: ${itemsError.message}`);
    }

    return data as Order;
  }

  async getOrderByInvoiceId(invoiceId: string): Promise<Order | null> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(ORDER_SELECT)
      .eq('invoice_id', invoiceId)
      .maybeSingle();

    if (error) {
      throw new Error(`OrderRepository.getOrderByInvoiceId failed: ${error.message}`);
    }

    return data as Order | null;
  }

  async getOrderByIdempotencyKey(key: string): Promise<Order | null> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(ORDER_SELECT)
      .eq('idempotency_key', key)
      .maybeSingle();
    if (error) throw new Error(`OrderRepository.getOrderByIdempotencyKey failed: ${error.message}`);
    return data as Order | null;
  }

  async setPaymentDetails(invoiceId: string, paymentUrl: string, dokuReference: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ payment_url: paymentUrl, doku_reference: dokuReference })
      .eq('invoice_id', invoiceId);
    if (error) throw new Error(`OrderRepository.setPaymentDetails failed: ${error.message}`);
  }

  async updateOrderStatus(invoiceId: string, status: OrderStatus, dokuReference?: string): Promise<Order> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status, ...(dokuReference ? { doku_reference: dokuReference } : {}) })
      .eq('invoice_id', invoiceId)
      .eq('status', 'PENDING')
      .select(ORDER_SELECT)
      .maybeSingle();
    if (error || !data) throw new Error(`OrderRepository.updateOrderStatus failed: ${error?.message ?? 'Order no longer PENDING'}`);
    return data as Order;
  }

  async claimPayment(invoiceId: string, reference?: string): Promise<Order | null> {
    const { data, error } = await supabaseAdmin.from('orders')
      .update({ status: 'PAID', ...(reference ? { doku_reference: reference } : {}) })
      .eq('invoice_id', invoiceId).eq('status', 'PENDING')
      .select(ORDER_SELECT).maybeSingle();
    if (error) throw new Error(`OrderRepository.claimPayment failed: ${error.message}`);
    return data as Order | null;
  }

  async claimFulfillment(invoiceId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin.from('orders')
      .update({ fulfillment_state: 'PROCESSING' })
      .eq('invoice_id', invoiceId).eq('status', 'PAID').eq('fulfillment_state', 'PENDING')
      .select('id').maybeSingle();
    if (error) throw new Error(`OrderRepository.claimFulfillment failed: ${error.message}`);
    return Boolean(data);
  }

  async markFulfillmentSent(invoiceId: string): Promise<void> {
    const { error } = await supabaseAdmin.from('orders')
      .update({ fulfillment_state: 'SENT', fulfillment_error: null })
      .eq('invoice_id', invoiceId).eq('fulfillment_state', 'PROCESSING');
    if (error) throw new Error(`OrderRepository.markFulfillmentSent failed: ${error.message}`);
  }

  async recordPaymentError(invoiceId: string, message: string): Promise<void> {
    const { error } = await supabaseAdmin.from('orders').update({ payment_error: message }).eq('invoice_id', invoiceId);
    if (error) throw new Error(`OrderRepository.recordPaymentError failed: ${error.message}`);
  }

  async recordFulfillmentError(invoiceId: string, stage: 'storage' | 'email', message: string): Promise<void> {
    const { error } = await supabaseAdmin.from('orders')
      .update({ fulfillment_state: 'PENDING', fulfillment_error: `${stage}: ${message}` })
      .eq('invoice_id', invoiceId).eq('fulfillment_state', 'PROCESSING');
    if (error) throw new Error(`OrderRepository.recordFulfillmentError failed: ${error.message}`);
  }

  async getAllOrders(status?: OrderStatus): Promise<Order[]> {
    let query = supabaseAdmin
      .from('orders')
      .select(ORDER_SELECT)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`OrderRepository.getAllOrders failed: ${error.message}`);
    }

    return (data || []) as Order[];
  }

  async getAnalyticsSummary(): Promise<OrderAnalyticsSummary> {
    const { data, error } = await supabaseAdmin.from('orders').select('amount, status');

    if (error) {
      throw new Error(`OrderRepository.getAnalyticsSummary failed: ${error.message}`);
    }

    const orders = (data || []) as Array<{ amount: number; status: OrderStatus }>;

    const paidOrders = orders.filter((o) => o.status === 'PAID');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const paidOrdersCount = paidOrders.length;
    const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING').length;
    const failedOrdersCount = orders.filter(
      (o) => o.status === 'FAILED' || o.status === 'EXPIRED',
    ).length;

    return {
      totalRevenue,
      totalOrders: orders.length,
      paidOrdersCount,
      pendingOrdersCount,
      failedOrdersCount,
    };
  }
}

export const orderRepository = new OrderRepository();
