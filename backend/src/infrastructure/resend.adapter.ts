import { Resend } from 'resend';
import { env } from '../config/env';
import { buildInvoicePdf, formatPaidAt, formatRupiah } from './invoice-pdf';

export interface SendDeliveryEmailParams {
  to: string;
  buyerName: string;
  invoiceId: string;
  /** One link per purchased product, with the price paid for it. */
  downloads: Array<{ title: string; url: string; price?: number }>;
  storeName?: string;
  buyerPhone?: string | null;
  paidAt?: Date;
  paymentMethod?: string;
  total?: number;
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
    const storeName = rawParams.storeName || 'Synectra Jasa Digital';
    const paidAt = rawParams.paidAt ?? new Date();
    const paymentMethod = rawParams.paymentMethod || 'Pembayaran online';
    const items = rawParams.downloads.map((d) => ({ title: d.title, price: d.price ?? 0 }));
    const total = rawParams.total ?? items.reduce((sum, i) => sum + i.price, 0);
    // buyerName and titles come from user input: escape everything interpolated into HTML.
    const e = escapeHtml;
    const muted = 'color:#6b7280;font-size:12px;';
    const itemRows = items
      .map(
        (i) => `
        <tr>
          <td style="padding:12px;font-size:13px;color:#111827;vertical-align:top;">${e(i.title)}</td>
          <td style="padding:12px;font-size:13px;color:#111827;font-weight:600;text-align:right;white-space:nowrap;vertical-align:top;">1 x ${formatRupiah(i.price)}</td>
        </tr>`,
      )
      .join('');
    const linkRows = rawParams.downloads
      .map(
        (d) => `
        <p style="margin:8px 0 2px;font-size:13px;color:#111827;">${e(d.title)}</p>
        <p style="margin:0 0 6px;font-size:13px;word-break:break-all;"><a href="${e(d.url)}" style="color:#059669;">${e(d.url)}</a></p>`,
      )
      .join('');
    const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Struk pembelian</title></head>
<body style="margin:0;padding:24px 12px;background:#f1f3f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:440px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px;">
    <h1 style="margin:0 0 12px;font-size:20px;color:#111827;">Hai ${e(rawParams.buyerName)}, terima kasih atas pembelianmu</h1>
    <p style="margin:0 0 16px;font-size:13px;color:#374151;line-height:1.5;">Kamu telah membeli produk dari <strong>${e(storeName)}</strong>. Email ini adalah struk pembelianmu, tidak ada tagihan yang perlu dibayar. Invoice PDF terlampir.</p>
    <p style="margin:0 0 8px;font-size:12px;color:#111827;letter-spacing:.04em;">RINGKASAN PESANAN</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;">
      <tr><td style="${muted}font-weight:600;padding-top:10px;">REF ID:</td><td style="${muted}font-weight:600;text-align:right;padding-top:10px;">TANGGAL:</td></tr>
      <tr><td style="${muted}word-break:break-all;padding:4px 8px 12px 0;">${e(rawParams.invoiceId)}</td><td style="${muted}text-align:right;white-space:nowrap;vertical-align:top;padding:4px 0 12px;">${e(formatPaidAt(paidAt))}</td></tr>
    </table>
    <p style="margin:0 0 6px;font-size:12px;color:#111827;">- ${e(storeName)}</p>
    <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <table width="100%" cellpadding="0" cellspacing="0">${itemRows}
        <tr><td colspan="2" style="padding:12px;border-top:1px solid #e5e7eb;text-align:right;font-size:13px;font-weight:700;color:#111827;">${formatRupiah(total)}</td></tr>
      </table>
      <div style="background:#ecfdf5;padding:12px;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#6b7280;">Ini link produkmu:</p>${linkRows}
      </div>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;font-size:12px;color:#374151;">
      <tr><td style="padding:6px 0;">Metode pembayaran</td><td style="padding:6px 0;text-align:right;">${e(paymentMethod)}</td></tr>
      <tr><td style="padding:10px 0;border-top:1px solid #d1d5db;font-weight:700;color:#111827;">Total</td><td style="padding:10px 0;border-top:1px solid #d1d5db;text-align:right;font-weight:700;color:#111827;">${formatRupiah(total)}</td></tr>
    </table>
    <p style="margin:20px 0 0;font-size:11px;color:#6b7280;line-height:1.5;">Simpan email ini sebagai bukti pembelian. Link produk juga bisa dibuka kapan saja dari halaman pesananmu. Email ini dikirim otomatis oleh ${e(storeName)}.</p>
  </div>
</body>
</html>
    `.trim();

    try {
      if (env.RESEND_SIMULATOR) {
        return { id: `simulated-email-${Date.now()}` };
      }

      const pdf = buildInvoicePdf({
        invoiceId: rawParams.invoiceId,
        storeName,
        buyerName: rawParams.buyerName,
        buyerPhone: rawParams.buyerPhone,
        buyerEmail: rawParams.to,
        paidAt,
        paymentMethod,
        items,
        total,
      });

      const { data, error } = await Promise.race([
        this.resend.emails.send({
          from: env.MAIL_FROM_ADDRESS,
          to: rawParams.to,
          subject: `Struk pembelian dari ${storeName}`,
          html: htmlContent,
          attachments: [{ filename: `Invoice-${rawParams.invoiceId}.pdf`, content: pdf }],
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
