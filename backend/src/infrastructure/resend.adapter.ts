import { Resend } from 'resend';
import { env } from '@/config/env';

export interface SendDeliveryEmailParams {
  to: string;
  buyerName: string;
  productTitle: string;
  invoiceId: string;
  signedDownloadUrl: string;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

const SEND_TIMEOUT_MS = 15_000;

export class ResendAdapter {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(env.RESEND_API_KEY);
  }

  async sendProductDeliveryEmail(rawParams: SendDeliveryEmailParams): Promise<{ id: string }> {
    // buyerName comes from the public checkout form: escape everything interpolated into HTML.
    const params = {
      ...rawParams,
      buyerName: escapeHtml(rawParams.buyerName),
      productTitle: escapeHtml(rawParams.productTitle),
      invoiceId: escapeHtml(rawParams.invoiceId),
      signedDownloadUrl: escapeHtml(rawParams.signedDownloadUrl),
    };
    const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Aset Digital Synectra Anda Siap Diunduh</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f17; color: #f1f5f9; padding: 24px; margin: 0;">
  <div style="max-width: 580px; margin: 0 auto; background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 32px;">
    <div style="border-bottom: 1px solid #1e293b; padding-bottom: 20px; margin-bottom: 24px;">
      <h1 style="font-size: 20px; font-weight: 700; color: #38bdf8; margin: 0;">SYNECTRA DIGITAL CATALOG</h1>
      <p style="font-size: 13px; color: #94a3b8; margin: 4px 0 0;">Pengiriman Aset Digital Otomatis</p>
    </div>

    <p style="font-size: 15px; margin: 0 0 16px;">Halo <strong>${params.buyerName}</strong>,</p>
    <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin: 0 0 20px;">
      Terima kasih telah berbelanja di Synectra. Pembayaran untuk pesanan <strong>${params.invoiceId}</strong> telah berhasil kami verifikasi.
    </p>

    <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="font-size: 13px; color: #94a3b8; margin: 0 0 6px;">Produk Digital:</p>
      <p style="font-size: 16px; font-weight: 600; color: #f8fafc; margin: 0;">${params.productTitle}</p>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.signedDownloadUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block;">
        Unduh Aset Digital Anda
      </a>
    </div>

    <div style="background: #0f172a; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
      <p style="font-size: 12px; color: #cbd5e1; margin: 0; line-height: 1.5;">
        <strong>Perhatian Keamanan:</strong> Tautan unduhan ini bersifat rahasia dan akan kedaluwarsa secara otomatis dalam <strong>24 jam</strong>. Pastikan Anda segera mengunduh dan menyimpan cadangan aset Anda.
      </p>
    </div>

    <p style="font-size: 12px; color: #64748b; margin: 24px 0 0; text-align: center; border-top: 1px solid #1e293b; padding-top: 16px;">
      Synectra Jasa Digital &bull; Email ini dibuat otomatis oleh sistem.
    </p>
  </div>
</body>
</html>
    `.trim();

    try {
      if (env.RESEND_SIMULATOR) {
        return { id: `simulated-email-${Date.now()}` };
      }

      const { data, error } = await Promise.race([
        this.resend.emails.send({
          from: env.MAIL_FROM_ADDRESS,
          to: rawParams.to,
          subject: `[Synectra] Unduh Aset Digital Anda: ${rawParams.productTitle}`,
          html: htmlContent,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Resend timeout')), SEND_TIMEOUT_MS).unref?.(),
        ),
      ]);

      if (error || !data?.id) {
        throw new Error(error?.message || 'Failed to send email via Resend');
      }

      return { id: data.id };
    } catch (err) {
      console.error('[Resend Error]', err instanceof Error ? err.message : err);
      throw err;
    }
  }
}

export const resendAdapter = new ResendAdapter();
