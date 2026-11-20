import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

export interface CreateDokuPaymentParams {
  invoiceId: string;
  amount: number;
  buyerName: string;
  buyerEmail: string;
  productTitle: string;
  /** One entry per cart product; DOKU requires their prices to sum to `amount`. Defaults to a single line. */
  lineItems?: Array<{ name: string; price: number }>;
}

export interface DokuPaymentResponse {
  paymentUrl: string;
  referenceId: string;
  invoiceId: string;
}

export class DokuAdapter {
  private clientId = env.DOKU_CLIENT_ID;
  private secretKey = env.DOKU_SECRET_KEY;
  private baseUrl = env.DOKU_API_BASE_URL;

  generateDigest(bodyString: string): string {
    return createHash('sha256').update(bodyString, 'utf8').digest('base64');
  }

  generateSignature(
    requestId: string,
    timestamp: string,
    requestTarget: string,
    digest?: string,
  ): string {
    // GET requests (Check Status API) are signed without a Digest line.
    const rawComponent = [
      `Client-Id:${this.clientId}`,
      `Request-Id:${requestId}`,
      `Request-Timestamp:${timestamp}`,
      `Request-Target:${requestTarget}`,
      ...(digest === undefined ? [] : [`Digest:${digest}`]),
    ].join('\n');

    const hmac = createHmac('sha256', this.secretKey).update(rawComponent, 'utf8').digest('base64');
    return `HMACSHA256=${hmac}`;
  }

  verifySignature(
    clientId: string,
    requestId: string,
    timestamp: string,
    signature: string,
    requestTarget: string,
    rawBody: string,
  ): boolean {
    if (clientId !== this.clientId) {
      return false;
    }

    const timestampMs = Date.parse(timestamp);
    if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 300_000) {
      return false;
    }

    const digest = this.generateDigest(rawBody);
    const expectedSignature = this.generateSignature(requestId, timestamp, requestTarget, digest);
    const expected = Buffer.from(expectedSignature, 'utf8');
    const received = Buffer.from(signature, 'utf8');

    return expected.length === received.length && timingSafeEqual(expected, received);
  }

  async createCheckout(params: CreateDokuPaymentParams): Promise<DokuPaymentResponse> {
    const requestTarget = '/checkout/v1/payment';
    const requestId = `REQ-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // DOKU expects ISO8601 UTC without milliseconds, e.g. 2020-09-22T01:51:00Z
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

    const payload = {
      order: {
        invoice_number: params.invoiceId,
        amount: params.amount,
        callback_url: `${env.APP_URL}/order/${params.invoiceId}`,
        line_items: (params.lineItems ?? [{ name: params.productTitle, price: params.amount }]).map((item) => ({
          ...item,
          quantity: 1,
        })),
      },
      payment: {
        payment_due_date: 60, // 60 minutes
      },
      // Per-request webhook target, so each environment (staging/production) gets its own notifications
      // without depending on the dashboard-wide Notification URL.
      additional_info: {
        override_notification_url: `${env.APP_URL}/api/webhooks/doku`,
      },
      customer: {
        name: params.buyerName,
        email: params.buyerEmail,
      },
    };

    const bodyString = JSON.stringify(payload);
    if (env.DOKU_SIMULATOR) {
      return {
        paymentUrl: `${env.APP_URL}/order/${params.invoiceId}?simulated=true`,
        referenceId: requestId,
        invoiceId: params.invoiceId,
      };
    }

    const digest = this.generateDigest(bodyString);
    const signature = this.generateSignature(requestId, timestamp, requestTarget, digest);
    const response = await fetch(`${this.baseUrl}${requestTarget}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': this.clientId,
        'Request-Id': requestId,
        'Request-Timestamp': timestamp,
        Signature: signature,
      },
      body: bodyString,
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      // DOKU's error body (e.g. invalid_client_id) is the only clue to the cause; it is logged, never shown to buyers.
      const detail = (await response.text().catch(() => '')).slice(0, 300);
      throw new Error(`DOKU checkout failed with status ${response.status}: ${detail}`);
    }

    const json = (await response.json()) as {
      response?: { payment?: { url?: string }; order?: { invoice_number?: string } };
    };
    const paymentUrl = json.response?.payment?.url;
    if (!paymentUrl) {
      throw new Error('DOKU checkout response missing payment URL');
    }

    return {
      paymentUrl,
      referenceId: requestId,
      invoiceId: params.invoiceId,
    };
  }

  /** Check Status API: the source of truth when a notification never arrived. Null = unknown, try later. */
  async getOrderStatus(invoiceId: string): Promise<DokuOrderStatus | null> {
    if (env.DOKU_SIMULATOR) return null;
    const requestTarget = `/orders/v1/status/${encodeURIComponent(invoiceId)}`;
    const requestId = `REQ-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const response = await fetch(`${this.baseUrl}${requestTarget}`, {
      headers: {
        'Client-Id': this.clientId,
        'Request-Id': requestId,
        'Request-Timestamp': timestamp,
        Signature: this.generateSignature(requestId, timestamp, requestTarget),
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 300);
      console.warn(`[doku-status] ${invoiceId} -> ${response.status}: ${detail}`);
      return null;
    }
    const json = (await response.json()) as { order?: { amount?: number }; transaction?: { status?: string } };
    const status = json.transaction?.status;
    if (status !== 'SUCCESS' && status !== 'FAILED' && status !== 'EXPIRED' && status !== 'PENDING') return null;
    return { status, amount: json.order?.amount };
  }
}

export type DokuTransactionStatus = 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'PENDING';

export interface DokuOrderStatus {
  status: DokuTransactionStatus;
  amount?: number;
}

export const dokuAdapter = new DokuAdapter();
